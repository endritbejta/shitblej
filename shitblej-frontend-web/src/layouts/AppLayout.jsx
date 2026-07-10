import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import Container from "../components/ui/Container";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white dark:bg-black">
      <Header />
      {/* Top padding clears the fixed header (single row on mobile, two on desktop). */}
      <main className="flex-1 pb-24 pt-16 md:pb-16 md:pt-[104px]">
        <Container className="py-6">
          <Outlet />
        </Container>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
