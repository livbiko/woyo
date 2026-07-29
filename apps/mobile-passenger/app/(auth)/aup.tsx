import { useRouter } from 'expo-router';
import AUPScreen from '../../src/components/AUPScreen';

export default function AuthAUP() {
  const router = useRouter();
  return <AUPScreen onBack={() => router.back()} />;
}
