import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, StyleSheet, Dimensions, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


const { height } = Dimensions.get('window');

interface PaymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectMethod: (method: string, reference?: string) => void;
  amount: number;
  loading?: boolean;
}

const METHODS = [
  { 
    id: 'MVola', 
    name: 'MVola', 
    color: '#FFCC00', 
    logo: require('../assets/images/mvola_madagascar_logo.jpeg'),
    textColor: '#000',
    type: 'push'
  },
  { 
    id: 'Orange Money', 
    name: 'Orange Money', 
    color: '#FF6600', 
    logo: require('../assets/images/orange_money_logo.png'),
    textColor: '#FFF',
    type: 'push'
  },
  { 
    id: 'Airtel Money', 
    name: 'Airtel Money', 
    color: '#EF1C25', 
    logo: require('../assets/images/airtel_izy.png'),
    textColor: '#FFF',
    type: 'push'
  }
];

export default function PaymentModal({ isVisible, onClose, onSelectMethod, amount, loading }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<any>(null);
  const [step, setStep] = React.useState<'select' | 'details' | 'confirm'>('select');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [reference, setReference] = React.useState('');

  const handleSelect = (method: any) => {
    setSelectedMethod(method);
    if (method.type === 'manual') {
      setStep('details');
    } else {
      setStep('details');
    }
  };

  const handleSubmit = () => {
    if (selectedMethod?.type === 'manual') {
      if (!reference) return;
      onSelectMethod('Kiosque', reference);
    } else {
      if (!phoneNumber) return;
      onSelectMethod(selectedMethod?.id || 'Inconnu', phoneNumber);
    }
  };

  const renderContent = () => {
    if (step === 'select') {
      return (
        <View style={styles.methodsContainer}>
          {METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={styles.methodButton}
              onPress={() => handleSelect(method)}
              disabled={loading}
            >
              {method.logo ? (
                <View style={styles.logoContainer}>
                  <Image source={method.logo} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                </View>
              ) : (
                <View style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                  <Ionicons name={method.type === 'manual' ? "home-outline" : "wallet-outline"} size={32} color="#6B7280" />
                  <Text style={[styles.methodText, { color: '#6B7280', marginTop: 4 }]} numberOfLines={1}>{method.name}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (selectedMethod?.type === 'manual') {
      return (
        <View style={styles.manualContainer}>
          <TouchableOpacity onPress={() => setStep('select')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backText}>Changer de méthode</Text>
          </TouchableOpacity>
          
          <Text style={styles.manualTitle}>Instructions Cashpoint</Text>
          <View style={styles.instructionCard}>
            <Text style={styles.manualInstruction}>
              1. Rendez-vous dans un point de vente.{"\n"}
              2. Envoyez <Text style={{fontWeight:'800'}}>{amount.toLocaleString('fr-FR')} Ar</Text> au :{"\n"}
              <Text style={styles.phoneNumber}>034 82 372 67</Text>{"\n"}
              3. Saisissez la référence du transfert ci-dessous :
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="receipt-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Ex: 5824962..."
              value={reference}
              onChangeText={setReference}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity 
            style={[styles.confirmButton, !reference && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={!reference || loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>Confirmer le dépôt</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    let adminNumber = '034 82 372 67';
    if (selectedMethod?.id === 'Orange Money') {
      adminNumber = '037 38 946 19';
    }

    return (
      <View style={styles.manualContainer}>
        <TouchableOpacity onPress={() => setStep('select')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backText}>Changer d'opérateur</Text>
        </TouchableOpacity>
        
        <View style={[styles.operatorBadge, { backgroundColor: selectedMethod?.color || '#eee' }]}>
          <Text style={[styles.operatorBadgeText, { color: selectedMethod?.textColor || '#000' }]}>{selectedMethod?.name || 'Opérateur'}</Text>
        </View>

        <Text style={styles.manualTitle}>Instructions de Paiement</Text>
        <View style={styles.instructionCard}>
          <Text style={styles.manualInstruction}>
            1. Transférez exactement <Text style={{fontWeight:'800'}}>{amount.toLocaleString('fr-FR')} Ar</Text> (en totalité avec les frais à votre charge) au numéro :{"\n"}
            <Text style={styles.phoneNumber}>{adminNumber}</Text>{"\n"}
            <Text style={{fontSize: 12, color: '#6B7280'}}>Nom : Aintsoa Mihajatiana</Text>{"\n\n"}
            2. Saisissez <Text style={{fontWeight:'800'}}>VOTRE</Text> numéro de téléphone ci-dessous et validez.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Votre numéro (ex: 034 XX XXX XX)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="flash-outline" size={20} color="#2563EB" />
          <Text style={styles.infoText}>
            La validation sera automatique et instantanée dès réception de votre transfert.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.confirmButton, phoneNumber.length < 10 && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={phoneNumber.length < 10 || loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>J'ai envoyé {amount.toLocaleString('fr-FR')} Ar</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Paiement Sécurisé</Text>
            <Text style={styles.subtitle}>Déverrouillez instantanément le contact du chauffeur.</Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total à régler</Text>
            <Text style={styles.amountValue}>{amount.toLocaleString('fr-FR')} Ar</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {renderContent()}
          </ScrollView>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: height * 0.9,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  amountContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2563EB',
  },
  methodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  methodButton: {
    width: '31%',
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 10,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  manualContainer: {
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    marginLeft: 4,
    color: '#6B7280',
    fontWeight: '600',
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  manualInstruction: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 15,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    marginLeft: 10,
    fontSize: 16,
    color: '#111827',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  instructionCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  operatorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  operatorBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  simpleText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 10,
    lineHeight: 18,
    fontWeight: '500',
  }
});
