import { StyleSheet } from 'react-native';
import { Colors } from 'constants/Colors';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingBottom: 32,
    paddingTop: 16,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 16,
    paddingRight: 4,
    textDecorationLine: 'underline',
  },
  camera: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 8,
    backgroundColor: Colors.lightgrey,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  gallery: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 8,
    backgroundColor: Colors.lightgrey,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 8,
  },
  detail: {
    paddingTop: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: Colors.text,
  },
  attribute: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  nametext: {
    fontSize: 18,
    paddingRight: 8,
    fontWeight: 'bold',
  },
  locationtext: {
    fontSize: 16,
    paddingLeft: 8,
  },
  descriptiontext: {
    fontSize: 16,
    paddingLeft: 8
  },
  visible: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
  visibleText: {
    fontSize: 16,
    color: Colors.text,
  },
  visibleSwitch: {
    transform: [{ scaleX: .7 }, { scaleY: .7 }],
  },
  logout: {
    marginTop: 32,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoutText: {
    color: Colors.white,
    paddingLeft: 8,
  },
  switch: {
    false: Colors.grey,
    true: Colors.background,
  },
  editWrapper: {
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 52, 52, 0.8)'
  },
  editContainer: {
    backgroundColor: Colors.formBackground,
    padding: 16,
    width: '80%',
    maxWidth: 400,
  },
  editHeader: {
    fontSize: 20,
    paddingBottom: 16,
  },
  inputField: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.lightgrey,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    maxHeight: 92,
  },
  input: {
    fontSize: 16,
    width: '100%',
  },
  editControls: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancel: {
    borderWidth: 1,
    borderColor: Colors.lightgrey,
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    width: 72,
    display: 'flex',
    alignItems: 'center',
  },
  save: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    width: 72,
    display: 'flex',
    alignItems: 'center',
  },
  saveText: {
    color: Colors.white,
  }
})

