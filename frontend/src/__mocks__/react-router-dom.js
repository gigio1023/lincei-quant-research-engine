import React from "react";

// Mock implementations for react-router-dom
const mockNavigate = jest.fn();
const mockLocation = {
  pathname: "/",
  search: "",
  hash: "",
  state: null,
  key: "default",
};

const mockParams = {};

// Mock components
const Link = ({ children, to, ...props }) =>
  React.createElement("a", { href: to, ...props }, children);
const NavLink = ({ children, to, ...props }) =>
  React.createElement("a", { href: to, ...props }, children);
const BrowserRouter = ({ children }) =>
  React.createElement("div", { "data-testid": "browser-router" }, children);
const Routes = ({ children }) =>
  React.createElement("div", { "data-testid": "routes" }, children);
const Route = ({ element }) =>
  React.createElement("div", { "data-testid": "route" }, element);
const Outlet = () => React.createElement("div", { "data-testid": "outlet" });

// Mock hooks
const useNavigate = () => mockNavigate;
const useLocation = () => mockLocation;
const useParams = () => mockParams;

module.exports = {
  Link,
  NavLink,
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
  // Reset function for tests
  __setMockLocation: (newLocation) => Object.assign(mockLocation, newLocation),
  __setMockParams: (newParams) => Object.assign(mockParams, newParams),
  __clearNavigate: () => mockNavigate.mockClear(),
};
