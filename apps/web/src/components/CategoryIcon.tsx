import {
  Zap, Wrench, Car, Scale, Stethoscope, Smile, UtensilsCrossed, Building2, HardHat, Ruler,
  Sparkles, ShieldCheck, Camera, Flower2, Scissors, PartyPopper, GraduationCap, Laptop,
  Network, ShieldAlert, Home, Truck, Briefcase, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Zap, Wrench, Car, Scale, Stethoscope, Smile, UtensilsCrossed, Building2, HardHat, Ruler,
  Sparkles, ShieldCheck, Camera, Flower2, Scissors, PartyPopper, GraduationCap, Laptop,
  Network, ShieldAlert, Home, Truck,
  // "CarTaxiFront" isn't in every lucide-react version -- fall back to Car for taxi services.
  CarTaxiFront: Car,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Briefcase;
  return <Icon className={className} />;
}
