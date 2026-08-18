import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Layout from "./components/Layout";

import Overview from "./pages/Overview";
import Live from "./pages/Live";
import Analytics from "./pages/Analytics";
import Investigation from "./pages/Investigation";
import Simulator from "./pages/Simulator";

import { StreamProvider } from "./content/StreamContext";

export default function App() {
  return (
    <BrowserRouter>
      <StreamProvider>

        <Routes>

          <Route element={<Layout />}>

            {/* DEFAULT PAGE = DASHBOARD */}
            <Route
              path="/"
              element={<Overview />}
            />

            {/* LIVE STREAM */}
            <Route
              path="/live"
              element={<Live />}
            />

            {/* DASHBOARD */}
            <Route
              path="/overview"
              element={<Overview />}
            />

            {/* ANALYTICS */}
            <Route
              path="/analytics"
              element={<Analytics />}
            />

            {/* INVESTIGATION */}
            <Route
              path="/investigation"
              element={<Investigation />}
            />

            {/* SIMULATOR */}
            <Route
              path="/simulator"
              element={<Simulator />}
            />

          </Route>

        </Routes>

      </StreamProvider>
    </BrowserRouter>
  );
}