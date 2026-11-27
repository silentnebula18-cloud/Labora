import {
  AlertCircle,
  ArrowLeftRight,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  CodeXml,
  Copy,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  Home,
  Info,
  LaptopMinimal,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Unlock,
  User,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react-native";
import { View } from "react-native";

import { COLORS } from "../constants/theme";

export type AppIconName =
  | "home"
  | "user"
  | "users"
  | "calendar"
  | "clock"
  | "location"
  | "class"
  | "clipboard"
  | "check"
  | "info"
  | "lock"
  | "unlock"
  | "play"
  | "stop"
  | "alert"
  | "plus"
  | "search"
  | "switch"
  | "logout"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "chevron-up"
  | "bell"
  | "flask"
  | "mail"
  | "eye"
  | "eye-off"
  | "shield-check"
  | "book"
  | "file-text"
  | "copy"
  | "sparkles"
  | "edit"
  | "trash"
  | "close"
  | "more-vertical"
  | "monitor-code"
  | "user-round-check"
  | "laptop-minimal"
  | "route";

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Komponen ikon terpusat menggunakan `lucide-react-native` (SVG vektor tajam).
 */
export default function AppIcon({
  name,
  size = 18,
  color = COLORS.primary,
  strokeWidth = 1.9,
}: AppIconProps) {
  switch (name) {
    case "home":
      return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    case "user":
      return <User size={size} color={color} strokeWidth={strokeWidth} />;
    case "user-round-check":
      return (
        <UserRoundCheck size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "laptop-minimal":
      return (
        <LaptopMinimal size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "route":
      return <Route size={size} color={color} strokeWidth={strokeWidth} />;
    case "users":
      return <Users size={size} color={color} strokeWidth={strokeWidth} />;
    case "calendar":
      return <Calendar size={size} color={color} strokeWidth={strokeWidth} />;
    case "clock":
      return <Clock size={size} color={color} strokeWidth={strokeWidth} />;
    case "location":
      return <MapPin size={size} color={color} strokeWidth={strokeWidth} />;
    case "class":
    case "book":
      return <BookOpen size={size} color={color} strokeWidth={strokeWidth} />;
    case "clipboard":
      return (
        <ClipboardList size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "file-text":
      return <FileText size={size} color={color} strokeWidth={strokeWidth} />;
    case "check":
      return <Check size={size} color={color} strokeWidth={strokeWidth} />;
    case "info":
      return <Info size={size} color={color} strokeWidth={strokeWidth} />;
    case "lock":
      return <Lock size={size} color={color} strokeWidth={strokeWidth} />;
    case "unlock":
      return <Unlock size={size} color={color} strokeWidth={strokeWidth} />;
    case "play":
      return <Play size={size} color={color} strokeWidth={strokeWidth} />;
    case "stop":
      return <Square size={size} color={color} strokeWidth={strokeWidth} />;
    case "alert":
      return (
        <AlertCircle size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "plus":
      return <Plus size={size} color={color} strokeWidth={strokeWidth} />;
    case "search":
      return <Search size={size} color={color} strokeWidth={strokeWidth} />;
    case "switch":
      return (
        <ArrowLeftRight size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "logout":
      return <LogOut size={size} color={color} strokeWidth={strokeWidth} />;
    case "chevron-right":
      return (
        <ChevronRight size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "chevron-left":
      return (
        <ChevronLeft size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "chevron-down":
      return (
        <ChevronDown size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "chevron-up":
      return <ChevronUp size={size} color={color} strokeWidth={strokeWidth} />;
    case "bell":
      return <Bell size={size} color={color} strokeWidth={strokeWidth} />;
    case "flask":
      return (
        <FlaskConical size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "mail":
      return <Mail size={size} color={color} strokeWidth={strokeWidth} />;
    case "eye":
      return <Eye size={size} color={color} strokeWidth={strokeWidth} />;
    case "eye-off":
      return <EyeOff size={size} color={color} strokeWidth={strokeWidth} />;
    case "shield-check":
      return (
        <ShieldCheck size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "copy":
      return <Copy size={size} color={color} strokeWidth={strokeWidth} />;
    case "sparkles":
      return <Sparkles size={size} color={color} strokeWidth={strokeWidth} />;
    case "edit":
      return <Pencil size={size} color={color} strokeWidth={strokeWidth} />;
    case "trash":
      return <Trash2 size={size} color={color} strokeWidth={strokeWidth} />;
    case "close":
      return <X size={size} color={color} strokeWidth={strokeWidth} />;
    case "more-vertical":
      return (
        <MoreVertical size={size} color={color} strokeWidth={strokeWidth} />
      );
    case "monitor-code":
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Monitor size={size} color={color} strokeWidth={strokeWidth} />
          <View
            style={{
              position: "absolute",
              top: size * 0.21,
            }}
          >
            <CodeXml
              size={Math.round(size * 0.42)}
              color={color}
              strokeWidth={strokeWidth + 0.2}
            />
          </View>
        </View>
      );
  }
}
