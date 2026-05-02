import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import AppLayout from "./components/layout/AppLayout";
import CommandPalette from "./components/ui/CommandPalette";
import Dashboard from "./pages/Dashboard";
import Wallet from "./pages/Wallet";
import Send from "./pages/Send";
import Receive from "./pages/Receive";
import History from "./pages/History";
import Multisig from "./pages/Multisig";
import NFT from "./pages/NFT";
import DApp from "./pages/DApp";
import AddressBook from "./pages/AddressBook";
import Resource from "./pages/Resource";
import Voting from "./pages/Voting";
import Settings from "./pages/Settings";

function App() {
  return (
    <Router>
      <AppLayout>
        <CommandPalette />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/send" element={<Send />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/history" element={<History />} />
            <Route path="/multisig" element={<Multisig />} />
            <Route path="/nft" element={<NFT />} />
            <Route path="/dapp" element={<DApp />} />
            <Route path="/address-book" element={<AddressBook />} />
            <Route path="/resources" element={<Resource />} />
            <Route path="/voting" element={<Voting />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AnimatePresence>
      </AppLayout>
    </Router>
  );
}

export default App;
