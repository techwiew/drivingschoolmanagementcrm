import { 
  Users, Bell, Shield, FileText, LayoutDashboard, 
  ClipboardCheck, BarChart3, Smartphone, Award, 
  ShieldCheck, Heart, Mail, Phone, MapPin, Building2,
  Calendar, CreditCard
} from 'lucide-react';

export const resolveIcon = (iconName: string, size: number = 24, className: string = '') => {
  const icons: { [key: string]: any } = {
    Users, Bell, Shield, FileText, LayoutDashboard, 
    ClipboardCheck, BarChart3, Smartphone, Award, 
    ShieldCheck, Heart, Mail, Phone, MapPin, Building2,
    Calendar, CreditCard
  };

  const IconComponent = icons[iconName];
  if (!IconComponent) return null;

  return <IconComponent size={size} className={className} />;
};
