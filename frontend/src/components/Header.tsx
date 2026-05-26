import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  ["/", "Cycle"],
  ["/control-plane", "Details"],
];

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2b3139] bg-[#0b0e11] text-[#eaecef]">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-5 lg:px-6">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fcd535] font-mono text-sm font-black text-[#181a20]">
            LQ
          </span>
          <span>
            <span className="block text-sm font-bold leading-none text-white">
              Lincei Quant
            </span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-[#707a8a]">
              Research Engine
            </span>
          </span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#1e2329] text-[#fcd535]"
                    : "text-[#929aa5] hover:bg-[#181a20] hover:text-white"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <span className="rounded-md border border-[#2b3139] bg-[#181a20] px-3 py-2 text-[11px] font-bold uppercase text-[#929aa5]">
          read-only
        </span>
      </nav>
    </header>
  );
};

export default Header;
