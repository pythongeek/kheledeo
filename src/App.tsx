import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import MatchDetail from './pages/MatchDetail'
import Live from './pages/Live'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import Virtual from './pages/Virtual'
import AIChat from './pages/AIChat'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="match/:id" element={<MatchDetail />} />
        <Route path="live" element={<Live />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="virtual" element={<Virtual />} />
        <Route path="ai-chat" element={<AIChat />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
