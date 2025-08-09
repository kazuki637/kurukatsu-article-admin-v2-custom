
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './ui/index'
import App from './ui/App'
import Login from './ui/Login'
import Dashboard from './ui/Dashboard'
import Edit from './ui/Edit'

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <Dashboard /> },
    { path: 'login', element: <Login /> },
    { path: 'edit/:id', element: <Edit /> },
    { path: 'new', element: <Edit /> },
  ]}
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
