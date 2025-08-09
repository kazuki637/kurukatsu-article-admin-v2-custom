
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function App(){
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(()=>{
    const loginStatus = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(loginStatus === 'true');
  },[]);

  const doLogout = async () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    navigate('/login');
  }

  return (
    <div style={{maxWidth: 1100, margin: '30px auto', padding:'0 16px', fontFamily:'ui-sans-serif, system-ui'}}>
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24}}>
        <Link to="/" style={{textDecoration:'none'}}>
          <h1 style={{margin:0, fontSize:24}}>Kurukatsu Article Admin</h1>
        </Link>
        <div>
          {isLoggedIn ? (<>
            <span style={{marginRight:12, fontSize:14, opacity:0.7}}>管理者</span>
            <button onClick={doLogout}>ログアウト</button>
          </>): (
            <Link to="/login">ログイン</Link>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  )
}
