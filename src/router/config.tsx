
import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Inventory from "../pages/inventory/page";
import Orders from "../pages/orders/page";
import Installation from "../pages/installation/page";
import Activities from "../pages/activities/page";
import Login from "../pages/login/page";
import Users from "../pages/users/page";
import AuthGuard from "../components/feature/AuthGuard";

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <AuthGuard><Home /></AuthGuard>,
  },
  {
    path: "/inventory",
    element: <AuthGuard><Inventory /></AuthGuard>,
  },
  {
    path: "/orders",
    element: <AuthGuard><Orders /></AuthGuard>,
  },
  {
    path: "/installation",
    element: <AuthGuard><Installation /></AuthGuard>,
  },
  {
    path: "/activities",
    element: <AuthGuard><Activities /></AuthGuard>,
  },
  {
    path: "/users",
    element: <AuthGuard><Users /></AuthGuard>,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
