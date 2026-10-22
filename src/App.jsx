
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import CriarConta from "./pages/CriarConta";
import Reposicao from "./pages/Reposicao";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/criar-conta" element={<CriarConta />} />
        <Route path="/reposicao" element={<Reposicao />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
