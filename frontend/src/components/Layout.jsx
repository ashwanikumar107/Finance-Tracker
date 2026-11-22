import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ title = 'Overview', children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header title={title} />
        <main className="main-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
