import { useRouter } from 'expo-router';
import AUPScreen from '../../src/components/AUPScreen';

export default function DriverAUP() {
  const router = useRouter();
  return <AUPScreen onBack={() => router.back()} />;
}
