import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";

export default function AppLayout() {
  

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black overflow-x-hidden">
      <Header />
      <main className="flex-1 px-4 py-6 max-w-6xl w-full mx-auto min-h-screen pt-24 pb-20 md:pb-6">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
