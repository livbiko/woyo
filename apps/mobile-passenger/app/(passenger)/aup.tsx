import { useRouter } from 'expo-router';
import AUPScreen from '../../src/components/AUPScreen';

export default function PassengerAUP() {
  const router = useRouter();
  return <AUPScreen onBack={() => router.back()} />;
}
