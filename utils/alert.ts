import { Alert as RNAlert } from 'react-native';
import { CustomAlertRef } from '../components/CustomAlert';

export const CustomAlert = {
  alert: (title: string, message?: string, buttons?: any[], options?: any) => {
    if (CustomAlertRef.current) {
      let type = 'success';
      const titleLower = title.toLowerCase();
      if (titleLower.includes('erreur') || titleLower.includes('refusé')) type = 'error';
      else if (titleLower.includes('attention') || titleLower.includes('attente') || titleLower.includes('déjà')) type = 'warning';
      
      CustomAlertRef.current.alert(title, message, buttons, type);
    } else {
      RNAlert.alert(title, message, buttons, options);
    }
  }
};
