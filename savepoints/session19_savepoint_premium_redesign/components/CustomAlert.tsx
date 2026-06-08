import React, { useState, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ButtonConfig = {
  text: string;
  onPress?: () => void;
  style?: 'cancel' | 'default' | 'destructive';
};

type AlertConfig = {
  title: string;
  message: string;
  buttons?: ButtonConfig[];
  type?: 'success' | 'error' | 'info' | 'warning';
};

export const CustomAlertRef = React.createRef<any>();

export const CustomAlertComponent = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({ title: '', message: '' });
  const [scaleValue] = useState(new Animated.Value(0.8));
  const [opacityValue] = useState(new Animated.Value(0));

  useImperativeHandle(CustomAlertRef, () => ({
    alert: (title: string, message?: string, buttons?: ButtonConfig[], type?: string) => {
      setConfig({ 
        title, 
        message: message || '', 
        buttons: buttons || [{ text: 'OK', onPress: () => close() }],
        type: type as any
      });
      setVisible(true);
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 7
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        })
      ]).start();
    }
  }));

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Animated.View 
          style={{ transform: [{ scale: scaleValue }], opacity: opacityValue, width: '100%', maxWidth: 384, zIndex: 10 }}
        >
          <View className="bg-white rounded-[32px] overflow-hidden shadow-2xl">
            {/* Header Icon */}
            <View className="items-center mt-8 mb-4">
              <View className={`w-20 h-20 rounded-[24px] items-center justify-center ${config.type === 'error' ? 'bg-red-50' : config.type === 'warning' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                <Ionicons 
                  name={config.type === 'error' ? 'close-circle' : config.type === 'warning' ? 'warning' : 'checkmark-circle'} 
                  size={40} 
                  color={config.type === 'error' ? '#EF4444' : config.type === 'warning' ? '#F97316' : '#3B82F6'} 
                />
              </View>
            </View>
            
            <View className="px-8 pb-8">
              <Text className="text-2xl font-black text-slate-900 text-center mb-3 tracking-tight">{config.title}</Text>
              {!!config.message && (
                <Text className="text-[15px] text-slate-500 font-semibold text-center leading-relaxed">
                  {config.message}
                </Text>
              )}
            </View>

            <View className="flex-row border-t border-slate-100">
              {config.buttons?.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    close();
                    if (btn.onPress) setTimeout(btn.onPress, 150);
                  }}
                  className={`flex-1 py-5 items-center justify-center ${idx > 0 ? 'border-l border-slate-100' : ''}`}
                  activeOpacity={0.7}
                >
                  <Text className={`font-black text-sm uppercase tracking-widest ${btn.style === 'cancel' ? 'text-slate-400' : btn.style === 'destructive' ? 'text-red-600' : 'text-blue-600'}`}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
