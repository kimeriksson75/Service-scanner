import React, { useState } from 'react';
import { Modal, StyleSheet, Text, Pressable, View } from 'react-native';
import { WebViewModal } from "react-native-webview-modal";

const AppModal = props => {
	const { title, description, action, actionDescription, isVisible } = props;
	console.log('props', {props});
	const [isModalVisible, setIsModalVisible] = useState(isVisible);
	const handleRespond = () => {
		console.log('handleRespond');
		setIsModalVisible(false);
		action();
	};
	return (
		<Modal
			animationType="slide"
			transparent={true}
			visible={isModalVisible}
			hardwareAccelerated={true}
			statusBarTranslucent={true}
	// onRequestClose={() => {
			//     setIsModalVisible(false);
			// }}
			// {...props}
			>
			<View style={styles.centeredView}>
				<View style={styles.modalView}>
					<Text style={styles.modalTitle}>{title}</Text>
					<Text style={styles.modalText}>{description}</Text>
					<Pressable
						style={[styles.button, styles.buttonClose]}
						onPress={() => handleRespond()}>
						<Text style={styles.textStyle}>{actionDescription || 'Stäng'}</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
    );
};
const styles = StyleSheet.create({
	wrapperView: {
			display: 'block',
	},
	centeredView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 22,
	},
	modalView: {
		margin: 20,
		backgroundColor: 'white',
		borderRadius: 20,
		padding: 35,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	button: {
		borderRadius: 20,
		padding: 10,
		elevation: 2,
	},
	buttonOpen: {
		backgroundColor: '#F194FF',
	},
	buttonClose: {
		backgroundColor: '#2196F3',
	},
	textStyle: {
		color: 'white',
		fontWeight: 'bold',
		textAlign: 'center',
	},
	modalTitle: {
			fontSize: 20,
			fontWeight: 'bold',
		marginBottom: 15,
		textAlign: 'center',
	},
	modalText: {
		marginBottom: 15,
		textAlign: 'center',
	},
});
  
export default AppModal;
