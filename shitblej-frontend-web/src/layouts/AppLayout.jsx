import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import Container from "../components/ui/Container";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white dark:bg-black">
      <Header />
      {/* Top padding clears the fixed header (single row on mobile, two on desktop).
          tabIndex={-1} so `#main-content` can move focus here rather than only
          scrolling - a <main> is not focusable on its own. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 pb-24 pt-16 md:pb-16 md:pt-[104px]"
      >
        <Container className="py-6">
          <Outlet />
        </Container>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
