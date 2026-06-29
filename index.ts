import "react-native-url-polyfill/auto"; // Supabase 가 필요로 하는 URL polyfill (최상단)
import { registerRootComponent } from "expo";

import { initSentry } from "@/lib/sentry";
import App from "./App";

initSentry();
registerRootComponent(App);
