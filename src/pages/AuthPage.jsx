import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  ChevronDown,
  Check,
  Search,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/SQLServerAuthContext";
import { getApiBase } from '@/lib/utils';

// Comprehensive country codes list (sorted alphabetically by country name)
const countryCodes = [
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+355", country: "Albania", flag: "🇦🇱" },
  { code: "+213", country: "Algeria", flag: "🇩🇿" },
  { code: "+376", country: "Andorra", flag: "🇦🇩" },
  { code: "+244", country: "Angola", flag: "🇦🇴" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+374", country: "Armenia", flag: "🇦🇲" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+375", country: "Belarus", flag: "🇧🇾" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+501", country: "Belize", flag: "🇧🇿" },
  { code: "+229", country: "Benin", flag: "🇧🇯" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+387", country: "Bosnia", flag: "🇧🇦" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+673", country: "Brunei", flag: "🇧🇳" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+855", country: "Cambodia", flag: "🇰🇭" },
  { code: "+237", country: "Cameroon", flag: "🇨🇲" },
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+238", country: "Cape Verde", flag: "🇨🇻" },
  { code: "+236", country: "Central African Republic", flag: "🇨🇫" },
  { code: "+235", country: "Chad", flag: "🇹🇩" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+269", country: "Comoros", flag: "🇰🇲" },
  { code: "+242", country: "Congo (Republic of the)", flag: "🇨🇬" },
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" },
  { code: "+357", country: "Cyprus", flag: "🇨🇾" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+243", country: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+253", country: "Djibouti", flag: "🇩🇯" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+503", country: "El Salvador", flag: "🇸🇻" },
  { code: "+240", country: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" },
  { code: "+372", country: "Estonia", flag: "🇪🇪" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
  { code: "+679", country: "Fiji", flag: "🇫🇯" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+241", country: "Gabon", flag: "🇬🇦" },
  { code: "+220", country: "Gambia", flag: "🇬🇲" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+502", country: "Guatemala", flag: "🇬🇹" },
  { code: "+224", country: "Guinea", flag: "🇬🇳" },
  { code: "+592", country: "Guyana", flag: "🇬🇾" },
  { code: "+509", country: "Haiti", flag: "🇭🇹" },
  { code: "+504", country: "Honduras", flag: "🇭🇳" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+354", country: "Iceland", flag: "🇮🇸" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+225", country: "Ivory Coast", flag: "🇨🇮" },
  { code: "+1876", country: "Jamaica", flag: "🇯🇲" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+7", country: "Kazakhstan", flag: "🇰🇿" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+856", country: "Laos", flag: "🇱🇦" },
  { code: "+371", country: "Latvia", flag: "🇱🇻" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" },
  { code: "+231", country: "Liberia", flag: "🇱🇷" },
  { code: "+218", country: "Libya", flag: "🇱🇾" },
  { code: "+423", country: "Liechtenstein", flag: "🇱🇮" },
  { code: "+370", country: "Lithuania", flag: "🇱🇹" },
  { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
  { code: "+853", country: "Macau", flag: "🇲🇴" },
  { code: "+389", country: "Macedonia", flag: "🇲🇰" },
  { code: "+261", country: "Madagascar", flag: "🇲🇬" },
  { code: "+265", country: "Malawi", flag: "🇲🇼" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },
  { code: "+356", country: "Malta", flag: "🇲🇹" },
  { code: "+222", country: "Mauritania", flag: "🇲🇷" },
  { code: "+230", country: "Mauritius", flag: "🇲🇺" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+373", country: "Moldova", flag: "🇲🇩" },
  { code: "+377", country: "Monaco", flag: "🇲🇨" },
  { code: "+976", country: "Mongolia", flag: "🇲🇳" },
  { code: "+382", country: "Montenegro", flag: "🇲🇪" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+227", country: "Niger", flag: "🇳🇪" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+850", country: "North Korea", flag: "🇰🇵" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+970", country: "Palestine", flag: "🇵🇸" },
  { code: "+507", country: "Panama", flag: "🇵🇦" },
  { code: "+675", country: "Papua New Guinea", flag: "🇵🇬" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+1787", country: "Puerto Rico", flag: "🇵🇷" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+221", country: "Senegal", flag: "🇸🇳" },
  { code: "+381", country: "Serbia", flag: "🇷🇸" },
  { code: "+248", country: "Seychelles", flag: "🇸🇨" },
  { code: "+232", country: "Sierra Leone", flag: "🇸🇱" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+252", country: "Somalia", flag: "🇸🇴" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+211", country: "South Sudan", flag: "🇸🇸" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" },
  { code: "+597", country: "Suriname", flag: "🇸🇷" },
  { code: "+268", country: "Swaziland", flag: "🇸🇿" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+963", country: "Syria", flag: "🇸🇾" },
  { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+676", country: "Tonga", flag: "🇹🇴" },
  { code: "+1868", country: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+678", country: "Vanuatu", flag: "🇻🇺" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+967", country: "Yemen", flag: "🇾🇪" },
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup" | "verify" | "verified" | "forgot" | "reset"
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryCodes.find(c => c.country === "United States"));
  const [countrySearch, setCountrySearch] = useState("");
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const termsRef = useRef(null);

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  // Forgot / reset password form state.
  // forgotSent intentionally does not distinguish "account found" from "account
  // not found" — the backend never tells us which happened (see
  // /api/auth/password-reset/request), and this screen must not reconstruct
  // that distinction from anything else either. It is only ever "submitted"
  // or "not submitted".
  const [forgotForm, setForgotForm] = useState({ email: "" });
  const [forgotSent, setForgotSent] = useState(false);
  const [resetForm, setResetForm] = useState({ token: "", newPassword: "", confirmPassword: "" });
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [errors, setErrors] = useState({});

  // Handle terms scroll detection
  const handleTermsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledTerms(true);
    }
  };

  // Validate email
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validate phone
  const validatePhone = (phone) => {
    return /^\d{6,15}$/.test(phone.replace(/\s/g, ""));
  };

  // Handle login submit
  const handleLogin = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!loginForm.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(loginForm.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!loginForm.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      // Call SQL Server auth API
      const { error } = await signIn(loginForm.email, loginForm.password);
      setIsLoading(false);

      if (!error) {
        // Redirect to portal on successful login
        navigate("/portal", { replace: true });
      }
    }
  };

  // Password reset — client-side mirror of the server's minimum bar, purely
  // for immediate feedback. The server re-validates independently and is the
  // only authority; nothing here should ever be treated as a substitute for it.
  const RESET_MIN_PASSWORD_LENGTH = 10;
  const RESET_COMMON_PASSWORD_HINTS = new Set([
    'password', 'password1', 'password123', '12345678', '123456789', 'qwerty123',
    'letmein123', 'iloveyou1', 'welcome123', 'admin1234', 'changeme1',
  ]);

  // Step 1 of password reset: request a code. The response is the identical
  // generic message whether or not the email belongs to an account — do not
  // add any branching here based on outcome. A network/validation error is
  // the only thing that produces different UI, and even then only a generic
  // error, never anything derived from whether the email exists.
  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!forgotForm.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(forgotForm.email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBase()}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotForm.email }),
      });
      const data = await response.json();

      // success is expected to be true here in every normal case (missing
      // email is caught above; the endpoint itself never reports whether the
      // account exists). A false here means a genuine error — rate limit,
      // network, or server issue — not "no such account".
      if (!data.success) {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: data.error || "Please try again in a moment.",
        });
        setIsLoading(false);
        return;
      }

      setForgotSent(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Password reset request error:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "We couldn't reach the server. Please try again.",
      });
      setIsLoading(false);
    }
  };

  // Step 2 of password reset: submit the code + new password. Every failure
  // mode from the server (invalid, expired, already used) comes back as one
  // generic message — render exactly that string, don't try to infer which
  // case occurred from anything else.
  const handleResetPasswordConfirm = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!resetForm.token.trim()) {
      newErrors.token = "Enter the reset code you were given";
    }
    if (!resetForm.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (resetForm.newPassword.length < RESET_MIN_PASSWORD_LENGTH) {
      newErrors.newPassword = `Password must be at least ${RESET_MIN_PASSWORD_LENGTH} characters`;
    } else if (RESET_COMMON_PASSWORD_HINTS.has(resetForm.newPassword.toLowerCase())) {
      newErrors.newPassword = "This password is too common — please choose another";
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBase()}/api/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetForm.token.trim(),
          newPassword: resetForm.newPassword,
        }),
      });
      const data = await response.json();
      setIsLoading(false);

      if (!data.success) {
        // Render the server's own generic message verbatim — never a
        // frontend-authored "expired" vs "wrong code" distinction.
        setErrors({ token: data.error || "This reset code is invalid or has expired." });
        return;
      }

      // No session token is issued by this endpoint, and none should be
      // assumed here — send the user back to a normal login, not an
      // auto-logged-in state.
      setResetForm({ token: "", newPassword: "", confirmPassword: "" });
      setForgotForm({ email: "" });
      setForgotSent(false);
      setErrors({});
      toast({
        title: "Password updated",
        description: "You can now log in with your new password.",
      });
      setMode("login");
    } catch (error) {
      console.error("Password reset confirm error:", error);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "We couldn't reach the server. Please try again.",
      });
    }
  };

  // Handle signup submit
  const handleSignup = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!signupForm.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!signupForm.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(signupForm.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!signupForm.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(signupForm.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!signupForm.password) {
      newErrors.password = "Password is required";
    } else if (signupForm.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!signupForm.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        // Parse name into first and last name
        const nameParts = signupForm.name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || 'User';

        // Map country name to ISO 3166-1 alpha-2 code (stored in DB as countryCode).
        // This must be accurate and complete: the backend uses this value to enforce
        // jurisdiction exclusions (sanctioned/restricted countries). The previous
        // version of this map only covered 7 countries and fell back to mangling the
        // phone dial code for everything else (e.g. Russia's "+7" became "7"), which
        // meant a jurisdiction check on the backend could never actually catch most
        // excluded countries. This map covers every country in the list above.
        const countryCodeMap = {
          'Afghanistan': 'AF',
          'Albania': 'AL',
          'Algeria': 'DZ',
          'Andorra': 'AD',
          'Angola': 'AO',
          'Argentina': 'AR',
          'Armenia': 'AM',
          'Australia': 'AU',
          'Austria': 'AT',
          'Azerbaijan': 'AZ',
          'Bahrain': 'BH',
          'Bangladesh': 'BD',
          'Belarus': 'BY',
          'Belgium': 'BE',
          'Belize': 'BZ',
          'Benin': 'BJ',
          'Bhutan': 'BT',
          'Bolivia': 'BO',
          'Bosnia': 'BA',
          'Botswana': 'BW',
          'Brazil': 'BR',
          'Brunei': 'BN',
          'Bulgaria': 'BG',
          'Burkina Faso': 'BF',
          'Burundi': 'BI',
          'Cambodia': 'KH',
          'Cameroon': 'CM',
          'Canada': 'CA',
          'Cape Verde': 'CV',
          'Central African Republic': 'CF',
          'Chad': 'TD',
          'Chile': 'CL',
          'China': 'CN',
          'Colombia': 'CO',
          'Comoros': 'KM',
          'Congo (Republic of the)': 'CG',
          'Costa Rica': 'CR',
          'Croatia': 'HR',
          'Cuba': 'CU',
          'Cyprus': 'CY',
          'Czech Republic': 'CZ',
          'Democratic Republic of the Congo': 'CD',
          'Denmark': 'DK',
          'Djibouti': 'DJ',
          'Ecuador': 'EC',
          'Egypt': 'EG',
          'El Salvador': 'SV',
          'Equatorial Guinea': 'GQ',
          'Eritrea': 'ER',
          'Estonia': 'EE',
          'Ethiopia': 'ET',
          'Fiji': 'FJ',
          'Finland': 'FI',
          'France': 'FR',
          'Gabon': 'GA',
          'Gambia': 'GM',
          'Georgia': 'GE',
          'Germany': 'DE',
          'Ghana': 'GH',
          'Greece': 'GR',
          'Guatemala': 'GT',
          'Guinea': 'GN',
          'Guyana': 'GY',
          'Haiti': 'HT',
          'Honduras': 'HN',
          'Hong Kong': 'HK',
          'Hungary': 'HU',
          'Iceland': 'IS',
          'India': 'IN',
          'Indonesia': 'ID',
          'Iran': 'IR',
          'Iraq': 'IQ',
          'Ireland': 'IE',
          'Israel': 'IL',
          'Italy': 'IT',
          'Ivory Coast': 'CI',
          'Jamaica': 'JM',
          'Japan': 'JP',
          'Jordan': 'JO',
          'Kazakhstan': 'KZ',
          'Kenya': 'KE',
          'Kuwait': 'KW',
          'Kyrgyzstan': 'KG',
          'Laos': 'LA',
          'Latvia': 'LV',
          'Lebanon': 'LB',
          'Lesotho': 'LS',
          'Liberia': 'LR',
          'Libya': 'LY',
          'Liechtenstein': 'LI',
          'Lithuania': 'LT',
          'Luxembourg': 'LU',
          'Macau': 'MO',
          'Macedonia': 'MK',
          'Madagascar': 'MG',
          'Malawi': 'MW',
          'Malaysia': 'MY',
          'Maldives': 'MV',
          'Mali': 'ML',
          'Malta': 'MT',
          'Mauritania': 'MR',
          'Mauritius': 'MU',
          'Mexico': 'MX',
          'Moldova': 'MD',
          'Monaco': 'MC',
          'Mongolia': 'MN',
          'Montenegro': 'ME',
          'Morocco': 'MA',
          'Mozambique': 'MZ',
          'Myanmar': 'MM',
          'Namibia': 'NA',
          'Nepal': 'NP',
          'Netherlands': 'NL',
          'New Zealand': 'NZ',
          'Nicaragua': 'NI',
          'Niger': 'NE',
          'Nigeria': 'NG',
          'North Korea': 'KP',
          'Norway': 'NO',
          'Oman': 'OM',
          'Pakistan': 'PK',
          'Palestine': 'PS',
          'Panama': 'PA',
          'Papua New Guinea': 'PG',
          'Paraguay': 'PY',
          'Peru': 'PE',
          'Philippines': 'PH',
          'Poland': 'PL',
          'Portugal': 'PT',
          'Puerto Rico': 'PR',
          'Qatar': 'QA',
          'Romania': 'RO',
          'Russia': 'RU',
          'Rwanda': 'RW',
          'Saudi Arabia': 'SA',
          'Senegal': 'SN',
          'Serbia': 'RS',
          'Seychelles': 'SC',
          'Sierra Leone': 'SL',
          'Singapore': 'SG',
          'Slovakia': 'SK',
          'Slovenia': 'SI',
          'Somalia': 'SO',
          'South Africa': 'ZA',
          'South Korea': 'KR',
          'South Sudan': 'SS',
          'Spain': 'ES',
          'Sri Lanka': 'LK',
          'Sudan': 'SD',
          'Suriname': 'SR',
          'Swaziland': 'SZ',
          'Sweden': 'SE',
          'Switzerland': 'CH',
          'Syria': 'SY',
          'Taiwan': 'TW',
          'Tajikistan': 'TJ',
          'Tanzania': 'TZ',
          'Thailand': 'TH',
          'Togo': 'TG',
          'Tonga': 'TO',
          'Trinidad and Tobago': 'TT',
          'Tunisia': 'TN',
          'Turkey': 'TR',
          'Turkmenistan': 'TM',
          'Uganda': 'UG',
          'Ukraine': 'UA',
          'United Arab Emirates': 'AE',
          'United Kingdom': 'GB',
          'United States': 'US',
          'Uruguay': 'UY',
          'Uzbekistan': 'UZ',
          'Vanuatu': 'VU',
          'Venezuela': 'VE',
          'Vietnam': 'VN',
          'Yemen': 'YE',
          'Zambia': 'ZM',
          'Zimbabwe': 'ZW',
        };

        const countryCode = countryCodeMap[selectedCountry?.country] || 'US';

        // Call backend signup API
        const response = await fetch(`${getApiBase()}/api/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email: signupForm.email,
            password: signupForm.password,
            phoneCode: selectedCountry?.code || '+1',
            phone: signupForm.phone,
            countryCode: countryCode
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setErrors({ submit: data.error || 'Signup failed' });
          setIsLoading(false);
          return;
        }

        // Store session and redirect
        const sessionData = {
          user: data.data,
          token: data.token,
          timestamp: Date.now(),
        };
        localStorage.setItem('inreal_session', JSON.stringify(sessionData));
        
        toast({
          title: 'Account Created',
          description: 'Welcome to InReal! Your account has been created successfully.',
        });

        setIsLoading(false);
        navigate('/portal', { replace: true });
      } catch (error) {
        console.error('Signup error:', error);
        setErrors({ submit: 'Failed to create account. Please try again.' });
        setIsLoading(false);
      }
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newValues = [...otpValues];
    newValues[index] = digit;
    setOtpValues(newValues);
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newValues = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setOtpValues(newValues);
    const nextEmpty = newValues.findIndex(v => !v);
    otpInputRefs.current[nextEmpty !== -1 ? nextEmpty : 5]?.focus();
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length < 6) {
      setErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMode("verified");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-charcoal-black flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-charcoal-black via-deep-graphite to-modern-grey relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-primary-accent rounded-full" />
          <div className="absolute bottom-40 right-10 w-96 h-96 border border-primary-accent rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-primary-accent rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Link to="/">
            <img
              src="https://horizons-cdn.hostinger.com/9e1f4551-bf70-48a3-a592-c6f31edcad6a/6a44e4eaa4f0d14816b5b75d29e50068.png"
              alt="InReal Logo"
              className="h-16 mb-8 hover:scale-105 transition-transform"
            />
          </Link>

          <h1 className="text-4xl font-bold text-off-white text-center mb-4">
            Own Real Estate <br />
            <span className="text-primary-accent">Worldwide</span>
          </h1>

          <p className="text-slate-grey text-center max-w-md text-lg">
            Join thousands of investors building wealth through premium real estate, starting from just $250.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-accent">$2.5M+</p>
              <p className="text-slate-grey text-sm">Total Invested</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-accent">750+</p>
              <p className="text-slate-grey text-sm">Active Investors</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-accent">15%</p>
              <p className="text-slate-grey text-sm">Avg. Returns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/">
              <img
                src="https://horizons-cdn.hostinger.com/9e1f4551-bf70-48a3-a592-c6f31edcad6a/6a44e4eaa4f0d14816b5b75d29e50068.png"
                alt="InReal Logo"
                className="h-10"
              />
            </Link>
          </div>

          {/* Back to Home */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-grey hover:text-primary-accent transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Mode Toggle */}
          {(mode === "login" || mode === "signup") && (
          <div className="flex bg-deep-graphite rounded-lg p-1 mb-8">
            <button
              onClick={() => {
                setMode("login");
                setErrors({});
              }}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${mode === "login"
                  ? "bg-primary-accent text-charcoal-black"
                  : "text-slate-grey hover:text-off-white"
                }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setErrors({});
              }}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${mode === "signup"
                  ? "bg-primary-accent text-charcoal-black"
                  : "text-slate-grey hover:text-off-white"
                }`}
            >
              Sign Up
            </button>
          </div>
          )}

          {/* Form Content */}
          <AnimatePresence mode="wait">
            {mode === "login" && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-3xl font-bold text-off-white mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-slate-grey">
                    Sign in to access your investment portfolio
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, email: e.target.value })
                      }
                      className={`w-full bg-deep-graphite border ${errors.email ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-off-white">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrors({});
                        setForgotSent(false);
                      }}
                      className="text-primary-accent hover:underline text-xs font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      className={`w-full bg-deep-graphite border ${errors.password ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-12 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-grey hover:text-off-white transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 text-lg rounded-xl"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                <p className="text-center text-slate-grey text-sm">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary-accent hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </motion.form>
            )}
            {mode === "signup" && (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignup}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-3xl font-bold text-off-white mb-2">
                    Create Account
                  </h2>
                  <p className="text-slate-grey">
                    Join thousands of global investors
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type="text"
                      value={signupForm.name}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, name: e.target.value })
                      }
                      className={`w-full bg-deep-graphite border ${errors.name ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type="email"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, email: e.target.value })
                      }
                      className={`w-full bg-deep-graphite border ${errors.email ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Phone with Country Code */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    {/* Country Code Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setCountryDropdownOpen(!countryDropdownOpen);
                          setCountrySearch("");
                        }}
                        className="flex items-center gap-1 bg-deep-graphite border border-modern-grey/50 rounded-xl py-4 px-3 text-off-white hover:border-primary-accent transition-colors min-w-[110px]"
                      >
                        <span>{selectedCountry?.flag}</span>
                        <span className="text-sm">{selectedCountry?.code}</span>
                        <ChevronDown className="w-4 h-4 text-slate-grey" />
                      </button>

                      <AnimatePresence>
                        {countryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-1 w-72 bg-deep-graphite border border-modern-grey/50 rounded-xl shadow-lg z-50"
                          >
                            {/* Search Input */}
                            <div className="p-2 border-b border-modern-grey/30">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-grey" />
                                <input
                                  type="text"
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  placeholder="Search country..."
                                  className="w-full bg-charcoal-black border border-modern-grey/30 rounded-lg py-2 pl-9 pr-3 text-sm text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* Country List */}
                            <div className="max-h-48 overflow-y-auto">
                              {countryCodes
                                .filter(country =>
                                  country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                  country.code.includes(countrySearch)
                                )
                                .map((country) => (
                                  <button
                                    key={`${country.code}-${country.country}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCountry(country);
                                      setCountryDropdownOpen(false);
                                      setCountrySearch("");
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-off-white hover:bg-modern-grey/50 transition-colors text-left"
                                  >
                                    <span className="text-lg">{country.flag}</span>
                                    <span className="text-sm font-medium">{country.code}</span>
                                    <span className="text-sm text-slate-grey truncate">
                                      {country.country}
                                    </span>
                                  </button>
                                ))}
                              {countryCodes.filter(country =>
                                country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                country.code.includes(countrySearch)
                              ).length === 0 && (
                                  <p className="px-3 py-2 text-sm text-slate-grey">No countries found</p>
                                )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Phone Input */}
                    <div className="relative flex-1">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                      <input
                        type="tel"
                        value={signupForm.phone}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, phone: e.target.value })
                        }
                        className={`w-full bg-deep-graphite border ${errors.phone ? "border-red-500" : "border-modern-grey/50"
                          } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, password: e.target.value })
                      }
                      className={`w-full bg-deep-graphite border ${errors.password ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-12 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-grey hover:text-off-white transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                  <p className="text-slate-grey text-xs mt-1">
                    Must be at least 8 characters
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={signupForm.confirmPassword}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className={`w-full bg-deep-graphite border ${errors.confirmPassword
                          ? "border-red-500"
                          : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="Confirm your password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-3">
                  <div
                    className="bg-charcoal-black border border-modern-grey/50 rounded-xl p-4 max-h-32 overflow-y-auto text-xs text-slate-grey custom-scrollbar"
                    ref={termsRef}
                    onScroll={handleTermsScroll}
                  >
                    <h4 className="font-semibold text-off-white mb-2">Terms and Conditions</h4>
                    <p className="mb-2">
                      By creating an account with InReal, you agree to the following terms:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>You are at least 18 years of age.</li>
                      <li>You will provide accurate and complete information.</li>
                      <li>You understand that real estate investments carry risks.</li>
                      <li>You agree to our Privacy Policy and Cookie Policy.</li>
                      <li>You consent to receive communications from InReal.</li>
                      <li>You understand KYC verification will be required for investments.</li>
                    </ul>
                    <p className="mt-2 text-primary-accent">
                      ↓ Scroll to read all terms before agreeing
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={signupForm.agreeToTerms}
                        onChange={(e) =>
                          setSignupForm({
                            ...signupForm,
                            agreeToTerms: e.target.checked,
                          })
                        }
                        disabled={!hasScrolledTerms}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${signupForm.agreeToTerms
                            ? "bg-primary-accent border-primary-accent"
                            : hasScrolledTerms
                              ? "border-modern-grey/50 hover:border-primary-accent"
                              : "border-modern-grey/30 bg-modern-grey/20"
                          } ${errors.agreeToTerms ? "border-red-500" : ""}`}
                      >
                        {signupForm.agreeToTerms && (
                          <Check className="w-3 h-3 text-charcoal-black" />
                        )}
                      </div>
                    </div>
                    <span className={`text-sm ${hasScrolledTerms ? "text-off-white" : "text-slate-grey"}`}>
                      I agree to the Terms and Conditions and Privacy Policy
                      {!hasScrolledTerms && (
                        <span className="block text-xs text-slate-grey mt-1">
                          (Please scroll through the terms above to enable)
                        </span>
                      )}
                    </span>
                  </label>
                  {errors.agreeToTerms && (
                    <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
                  )}
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{errors.submit}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 text-lg rounded-xl"
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>

                <p className="text-center text-slate-grey text-sm">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary-accent hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </motion.form>
            )}

            {/* Email OTP Verification Screen */}
            {mode === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-10 h-10 text-primary-accent" />
                  </div>
                  <h2 className="text-3xl font-bold text-off-white mb-2">Check Your Email</h2>
                  <p className="text-slate-grey">We've sent a 6-digit verification code to</p>
                  <p className="text-primary-accent font-semibold mt-1 mb-6">{signupForm.email}</p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex gap-2 sm:gap-3 justify-center">
                    {otpValues.map((val, i) => (
                      <input
                        key={i}
                        ref={el => { otpInputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold bg-deep-graphite border-2 rounded-xl text-off-white focus:outline-none transition-colors ${val ? 'border-primary-accent' : 'border-modern-grey/50 focus:border-primary-accent'}`}
                      />
                    ))}
                  </div>
                  {errors.otp && (
                    <p className="text-red-500 text-xs text-center">{errors.otp}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || otpValues.join('').length < 6}
                    className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 text-lg rounded-xl disabled:opacity-50"
                  >
                    {isLoading ? "Verifying..." : "Verify Email"}
                  </Button>

                  <p className="text-center text-slate-grey text-sm">
                    Didn't receive it?{" "}
                    <button
                      type="button"
                      onClick={() => setOtpValues(['', '', '', '', '', ''])}
                      className="text-primary-accent hover:underline font-medium"
                    >
                      Resend code
                    </button>
                  </p>
                  <p className="text-center">
                    <button
                      type="button"
                      onClick={() => { setMode("signup"); setErrors({}); }}
                      className="text-slate-grey hover:text-off-white text-sm transition-colors"
                    >
                      ← Back to sign up
                    </button>
                  </p>
                </form>
              </motion.div>
            )}

            {/* Verified / Welcome Screen */}
            {mode === "verified" && (
              <motion.div
                key="verified"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-4 space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 bg-primary-accent/20 rounded-full flex items-center justify-center mx-auto"
                >
                  <Check className="w-12 h-12 text-primary-accent" />
                </motion.div>

                <div>
                  <h2 className="text-3xl font-bold text-off-white mb-3">Welcome Aboard!</h2>
                  <p className="text-slate-grey leading-relaxed">
                    Your email has been verified. Our team will be in touch shortly to complete your KYC verification and activate full access.
                  </p>
                </div>

                <Link to="/portal">
                  <Button className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 text-lg rounded-xl">
                    Explore the Portal
                  </Button>
                </Link>
                <p className="text-slate-grey text-xs">
                  Full investment access enabled after KYC verification
                </p>
              </motion.div>
            )}

            {/* Forgot Password — Step 1: request a reset code */}
            {mode === "forgot" && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {!forgotSent ? (
                  <form onSubmit={handleForgotPasswordRequest} className="space-y-5">
                    <div>
                      <h2 className="text-3xl font-bold text-off-white mb-2">
                        Reset your password
                      </h2>
                      <p className="text-slate-grey">
                        Enter the email on your account and we'll get reset instructions to you.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-off-white mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                        <input
                          type="email"
                          value={forgotForm.email}
                          onChange={(e) => setForgotForm({ email: e.target.value })}
                          className={`w-full bg-deep-graphite border ${errors.email ? "border-red-500" : "border-modern-grey/50"
                            } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 text-lg rounded-xl"
                    >
                      {isLoading ? "Sending..." : "Send Reset Instructions"}
                    </Button>

                    <p className="text-center">
                      <button
                        type="button"
                        onClick={() => { setMode("login"); setErrors({}); }}
                        className="text-slate-grey hover:text-off-white text-sm transition-colors"
                      >
                        ← Back to login
                      </button>
                    </p>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-primary-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-10 h-10 text-primary-accent" />
                      </div>
                      <h2 className="text-3xl font-bold text-off-white mb-2">Check your inbox</h2>
                      <p className="text-slate-grey">
                        If an account exists for that email, password reset instructions have been sent.
                      </p>
                    </div>

                    <Button
                      onClick={() => { setMode("reset"); setErrors({}); }}
                      className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 text-lg rounded-xl"
                    >
                      I have a reset code
                    </Button>

                    <p className="text-center">
                      <button
                        type="button"
                        onClick={() => { setMode("login"); setForgotSent(false); setErrors({}); }}
                        className="text-slate-grey hover:text-off-white text-sm transition-colors"
                      >
                        ← Back to login
                      </button>
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Forgot Password — Step 2: submit the code and choose a new password */}
            {mode === "reset" && (
              <motion.form
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPasswordConfirm}
                className="space-y-5"
              >
                <div>
                  <div className="w-16 h-16 bg-primary-accent/20 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-8 h-8 text-primary-accent" />
                  </div>
                  <h2 className="text-3xl font-bold text-off-white mb-2">
                    Enter your reset code
                  </h2>
                  <p className="text-slate-grey">
                    Enter the reset code you were given, then choose a new password.
                  </p>
                </div>

                {/* Reset code */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Reset code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type="text"
                      autoComplete="one-time-code"
                      value={resetForm.token}
                      onChange={(e) => setResetForm({ ...resetForm, token: e.target.value })}
                      className={`w-full bg-deep-graphite border ${errors.token ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors font-mono text-sm`}
                      placeholder="Paste the code you were given"
                    />
                  </div>
                  {errors.token && (
                    <p className="text-red-500 text-xs mt-1">{errors.token}</p>
                  )}
                </div>

                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type={showResetPassword ? "text" : "password"}
                      value={resetForm.newPassword}
                      onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                      className={`w-full bg-deep-graphite border ${errors.newPassword ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-12 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="At least 10 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-grey hover:text-off-white transition-colors"
                    >
                      {showResetPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-grey" />
                    <input
                      type={showResetPassword ? "text" : "password"}
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                      className={`w-full bg-deep-graphite border ${errors.confirmPassword ? "border-red-500" : "border-modern-grey/50"
                        } rounded-xl py-4 pl-12 pr-4 text-off-white placeholder-slate-grey focus:outline-none focus:border-primary-accent transition-colors`}
                      placeholder="Re-enter your new password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold py-4 text-lg rounded-xl"
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>

                <p className="text-center">
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setErrors({}); setResetForm({ token: "", newPassword: "", confirmPassword: "" }); }}
                    className="text-slate-grey hover:text-off-white text-sm transition-colors"
                  >
                    ← Back to login
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <Toaster />
    </div>
  );
}