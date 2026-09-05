import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Series from "./pages/Series";
import Read from "./pages/Read";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/series/:id" element={<Series />} />
          <Route path="/read/:id/:file" element={<Read />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
