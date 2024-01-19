// import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import NfcManager, {NfcTech, NfcEvents} from 'react-native-nfc-manager';

import React, {useState, useEffect, useRef} from 'react';
import verifyScanner from './src/scanner/verify';
import authenticateScanner from './src/scanner/authenticate';
import verifyTag from './src/tag/verify';
import connectTag from './src/tag/connect';
import authenticateTag from './src/tag/authenticate';
import getServiceById from './src/service/getServiceById';
import { useTimeout } from './src/hooks/useTimeout';
import AppModal from './src/utils/appModal';
import {Picker} from 'react-native-wheel-pick';
import {APP_BASE_URL} from '@env';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  useColorScheme,
  View,
  Platform,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import WebViewModalProvider, { WebViewModal } from "react-native-webview-modal";

import { Colors } from 'react-native/Libraries/NewAppScreen';
import {
  Avatar,
  Button,
  FAB,
  useTheme,
  Text,
  Card,
  Divider,
  ActivityIndicator,
  PaperProvider,
  MD2Colors,
  Icon,
} from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const LeftContent = props => <Avatar.Icon {...props} icon="folder" />

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  console.info('isDarkMode', isDarkMode);

  const theme = useTheme();
  
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const [scanner, setScanner] = useState({});
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [issuedTag, setIssuedTag] = useState({});
  const [signInToken, setSignInToken] = useState(null);
  const [service, setService] = useState(null);
  const [_users, setUsers] = useState([]);
  const [_services, setServices] = useState([]);
  const [selectUserData, setSelectUserData] = useState('');
  const [selectServiceData, setSelectServiceData] = useState('');
  const [externalAppUrl, setExternalAppUrl] = useState(null);
  const [hasNfc, setHasNFC] = React.useState(null);
  const webviewRef = useRef();


  const idleTimeout = useTimeout();
  const logoutTimeout = useTimeout();

  const clearInputUI = () => {
    setUsers([]);
    setServices([]);
    setSelectUserData('');
    setSelectServiceData('');
  };
  React.useEffect(() => {
    const checkIsSupported = async () => {
      const deviceIsSupported = await NfcManager.isSupported();
      console.info('deviceIsSupported', deviceIsSupported);
      setHasNFC(deviceIsSupported);
      return;
    };

    checkIsSupported();
  }, []);

  const onInitScanner = async () => {
    setScanning(true);
    let _tag = null;

    try {
      await NfcManager.requestTechnology([NfcTech.Ndef]);

      _tag = await NfcManager.getTag();
      _tag.ndefStatus = await NfcManager.ndefHandler.getNdefStatus();
      const {id} = _tag;
      if (id) {
        setIssuedTag(id);
        onScan({
          token: scanner?.token,
          scanner: scanner?.scannerId,
          tag: id,
          userId: '',
        });
      }
      if (Platform.OS === 'ios') {
        await NfcManager.setAlertMessageIOS(`Toppen! Id: ${id} 🚀`);
      }
    } catch (ex) {
      // for tag reading, we don't actually need to show any error
      console.log(ex);
      setScanning(false);
    } finally {
      NfcManager.cancelTechnologyRequest();
      setScanning(false);
    }
  };

  const launchApp = async ({ accessToken, serviceId, residenceId }) => {
    const url = `${APP_BASE_URL}/user/authenticate/${accessToken}/${serviceId}/${residenceId}`;
    // setModalData({
    //   title: 'Inloggningen lyckades!',
    //   description: 'Du kommer nu slussas vidare till bokiningssystemet',
    //   action: () => { },
    //   actionDescription: 'Börja boka',
    //   isVisible: true,
    // })
    setExternalAppUrl(url);
    // webviewRef.current.postMessage('Data from React Native App');
    webviewRef.current.postMessage(JSON.stringify({ message: "your message" , data: "your data"}));

    // closeWebViewOnInactivity();
    // Linking.openURL(externalAppUrl);
  }
  const triggerIdleTimer = () => {
    console.log('triggerIdleTimer');
    clearTimeout(idleTimeout.current);
    idleTimeout.current = setTimeout(() => { 
      Alert.alert(  
        'Automatisk utloggning',
        'Du har varit inaktiv i mer än fem minuter och kommer därför loggas ut. Välkommen åter!',
      );
      triggerLogoutTimer();
      
    }, 1000 * 60 * 5); // 5 minutes
  }

  const triggerLogoutTimer = () => {
    console.log('triggerLogoutTimer');
    clearTimeout(logoutTimeout.current);
    logoutTimeout.current = setTimeout(() => {
      
      setExternalAppUrl(`${APP_BASE_URL}/user/logout/`);
      setupScanner();
    }, 5000);
  }
  const [modalData, setModalData] = useState({
    title: 'Inloggningen lyckades!',
    description: 'Du kommer nu slussas vidare till bokiningssystemet',
    action: () => { },
    actionDescription: 'Börja boka',
    isVisible: true,
  });

  const onExternalAppNavState = navState => {
    console.log('navState', navState);
    const { url } = navState;
    // updateInactivityTimer();
    if (url.includes('logout')) {
      // clearInactivityTimer();
      setExternalAppUrl(null);
      setupScanner();
    } else {
      triggerIdleTimer();
    }
  };

  const onAuthenticateTag = async ({ tag, token }) => {
    setConnecting(false);

    const authResult = await authenticateTag({tag, token});
    launchApp({
      accessToken: authResult.accessToken,
      serviceId: authResult.service._id,
      residenceId: authResult.service.residence,
    });
  };

  const onConnectTag = async () => {
    const body = {
      tag: issuedTag,
      scannerId: scanner._id,
      token: scanner.token,
      username: selectUserData,
      servicename: selectServiceData,
    };
    await connectTag(body);
    if (scanner?.token) {
      setSignInToken(scanner.token);
    }
    onAuthenticateTag({tag: issuedTag, token: scanner?.token});
  };

  const onAbortConnect = () => {
    setConnecting(false);
    setScanning(false);
    clearInputUI();
  }

  const onCreateUser = () => {
    const url = `${APP_BASE_URL}/user/create/${scanner?.residenceId}`;
    setExternalAppUrl(url);
  }

  const onScan = async scanData => {
    const verifyResult = await verifyTag(scanData);
    clearInputUI();
    const {
      users = [],
      services = [],
      tag = null,
      user: existingUser = null,
    } = verifyResult;
    if (!tag && !existingUser) {
      setConnecting(true);
      if (users.length > 0 && services.length > 0) {
        console.log(JSON.stringify(users, null, 2));
        const _selectUserData = users.map(user => {
          return {
            label: `${user.firstname} ${user.lastname}`,
            value: user.username,
          };
        });
        const _selectServiceData = services.map(_service => {
          return {
            label: _service.name,
            value: _service.name,
          };
        });
        setUsers(_selectUserData);
        setServices(_selectServiceData);
        if (_selectServiceData.length === 1) {
          setSelectServiceData(_selectServiceData[0].value);
        }
      }
    } else {
      setSelectServiceData(tag.serviceId);
      console.info('issuedTag', issuedTag);
      onAuthenticateTag({tag: scanData.tag, token: scanner?.token});
    }
  };
  const setupScanner = async () => {
    console.info('setupScanner');
    clearTimeout(logoutTimeout.current);
    clearTimeout(idleTimeout.current);
    clearInputUI();
    const verifyResult = await verifyScanner(data);
    console.log('verifyResult', JSON.stringify(verifyResult, null, 2));
    if (!verifyResult.scanner) {
      return;
    }
    setScanner({...verifyResult.scanner});
    console.info('authenticateScanner');
    const authResult = await authenticateScanner(
      verifyResult?.scanner?.scannerId,
    );
    console.log('authResult', JSON.stringify(authResult, null, 2));
    const {token = null} = authResult;

    if (token) {
      const serviceResult = await getServiceById(
        verifyResult?.scanner?.serviceId,
        token,
      );
      setService(serviceResult);
      setScanner({...verifyResult.scanner, token: token});
    }
  };

  const readTag = async () => {
    let tag = null;

    try {
      await NfcManager.requestTechnology([NfcTech.Ndef]);

      tag = await NfcManager.getTag();
      tag.ndefStatus = await NfcManager.ndefHandler.getNdefStatus();
      console.log('tag', tag);
      if (Platform.OS === 'ios') {
        await NfcManager.setAlertMessageIOS('Success');
      }
    } catch (ex) {
      // for tag reading, we don't actually need to show any error
      console.log(ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }

    return tag;
  };

  

  const data = {
    scanner: 'test-scanner',
  };

  useEffect(() => {
    setSelectUserData('');
    setSelectServiceData('');
    setExternalAppUrl(null);
    setupScanner();
    onAbortConnect();
  }, []);

  const handleVideoEvents = event => {
    let eventObj = JSON.parse(event.nativeEvent.data)
    let message = eventObj.message
    let data = eventObj.data
    console.log('message :', message)
    console.log('data :', data)
}
  return (
    <>
      {externalAppUrl ? (
        <View style={StyleSheet.absoluteFill}>
          <SafeAreaView style={styles.view}>
            <WebView
              ref={webviewRef}
              javaScriptCanOpenWindowsAutomatically={true}
              incognito={true}
              cacheEnabled={false}
              clearCache={true}
              clearHistory={true}
              source={{uri: externalAppUrl}}
              style={{flex: 1}}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              onNavigationStateChange={navState =>
                onExternalAppNavState(navState)
              }
              onMessage={event => handleVideoEvents(event)}
            >
              {/* <AppModal {...modalData} /> */}
            
            </WebView>
            </SafeAreaView>
          </View>
      ) : (
        
        <SafeAreaView style={styles.view}>
          <View style={styles.container}>
            {service?.name ? (
              <>
                <View style={styles.header}>
                  <Icon
                    source="calendar"
                    size={40}
                    color="#252422"
                    style={styles.logo}
                  />
                  <Text variant="headlineSmall" style={styles.title}>{service?.name}</Text>
                </View>
                <Divider style={styles.divider} />
                {!scanning && !connecting && (
                  <>
                    <Icon
                      source="information-outline"
                      size={20}
                      color="#0f4c5c"
                    />
                    <Text style={styles.infoText} variant="bodyLarge">
                      För bästa resultat placera taggen så nära enhetens <Text style={styles.infoTextHighlighted}>övre kant </Text>
                      som det går. Om läsaren svarar med ett felmeddelande så testa igen.</Text>
                    <Button
                      style={styles.button}
                      icon="calendar"
                      mode="contained"
                      onPress={() => onInitScanner()}>
                      Klicka för att skanna
                    </Button>
                    <Divider style={styles.divider} />
                    <Icon
                      source="plus"
                      size={20}
                      color="#5C7457"
                    />
                    <Text style={styles.infoText} variant="bodyLarge">Skapa din användare för <Text style={styles.infoTextHighlighted}>{service?.name}</Text> genom att klicka på skapa användare</Text>
                    <Button
                      style={styles.createUserButton}
                      icon="plus"
                      mode="contained"
                      onPress={() => onCreateUser()}>
                      Skapa användare
                    </Button>
                    <Divider style={styles.divider} />

                  </>
                )}
              </>
            ) : (
              <View style={styles.loaderWrapper}>
                {/* <Text style={styles.title}>Fixar lite...</Text> */}
                <ActivityIndicator animating={true} color="#403d39" />
              </View>
            )}
            {_users.length > 0 && _services.length > 0 && (
              <>
                <View style={styles.connectContainer}>
                  <Icon
                    source="information-outline"
                    size={30}
                    color="#252422"
                  />
                  <Text style={styles.infoText} variant="bodyLarge">Välj först ditt användarnamn i skrollhjulet nedan. Klicka sedan på koppla för att koppla ditt användarkonto till skannad tagg </Text>
                  <Text style={styles.infoText} variant="bodyLarge">Om ditt användarnamn inte finns listat, avbryt och skapa en användare.</Text>
                  <Picker
                    style={styles.picker}
                    itemTextStyle={styles.pickerItem}
                    placeholder="Välj användare"
                    pickerData={_users}
                    onValueChange={value => setSelectUserData(value)}
                    />
                  {/* <Picker
                    pickerData={_services}
                    style={styles.picker}
                    itemTextStyle={styles.pickerItem}
                    placeholder="Välj service"
                    onValueChange={value => setSelectServiceData(value)}
                    /> */}
                  <Button
                    disabled={!selectUserData || !selectServiceData}
                    style={styles.button}
                    buttonColor="#eb5e28"
                    textColor="#fff"
                    icon="attachment"
                    mode="contained"
                    onPress={() => onConnectTag()}
                    accessibilityLabel="Koppla">
                    Koppla
                  </Button>
                  <Divider style={styles.divider} />
                  <Button
                    style={styles.buttonCancel}
                    buttonColor="#eb5e28"
                    textColor="#fff"
                    icon="cancel"
                    mode="contained"
                    onPress={() => onAbortConnect()}
                    accessibilityLabel="Avbryt">
                    Avbryt
                  </Button>
                </View>
              </>
              )}
          </View>
        </SafeAreaView>

      )}
    </>
  );
}
//org.reactjs.native.example.BookingScanner 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    color: '#252422',
    backgroundColor: '#c6c7c4',
    // justifyContent: 'space-around',
    paddingHorizontal: 20,
    // width: '100%',
  },
  connectContainer: {
    backgroundColor: '#c6c7c4',
    color: 'white',
    width: '100%',
    display: 'flex',
    justifyContent: 'left',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'left',
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c6c7c4',
    color: 'white',
    width: '100%',
    paddingTop: 40,
  },
  view: {
    // alignSelf: 'stretch',
    flex: 1,
    width: '100%',
  },
  title: {
    color: '#252422',
    textAlign: 'center',
    backgroundColor: '#c6c7c4',
    fontWeight: 'bold',

  },
  button: {
    fontSize: 32,
    fontWeight: 'bold',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    backgroundColor: '#0f4c5c',
    marginVertical: 8,
  },
  buttonCancel: {
    fontSize: 32,
    fontWeight: 'bold',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    backgroundColor: '#eb5e28',
    marginVertical: 8,
  },
  createUserButton: {
    fontSize: 32,
    fontWeight: 'bold',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    backgroundColor: '#5C7457',
    marginVertical: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 'bold',
    letterSpacing: 0.25,
    textAlign: 'center',
    color: 'white',
  },

  infoText: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: 0.25,
    textAlign: 'left',
    color: '#252422',
    marginVertical: 8,
  },
  infoTextHighlighted: {
    fontWeight: 'bold',
  },
  picker: {
    padding: 0,
    margin: 0,
    // height: 160,
    paddingHorizontal: 0,
    borderRadius: 8,
    color: 'green',
    alignItems: 'stretch',
    marginBottom: 20,
    marginTop: 20,
    backgroundColor: 'transparent',

  },
  pickerItem: {
    color: '#fff',
  },

  divider: {
    backgroundColor: '#403d39',
    marginTop: 20,
    marginBottom: 20,
  },
  loaderWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
