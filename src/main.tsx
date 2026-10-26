import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/global.css";
import "./components/header/Header.css";
import "./pages/home/HomePage.css";
import "./pages/gameplay/GameplayPage.css";
import "./pages/setup/CampaignSetupPage.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
