
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_PASSWORD = 'kurukatsu637';

export default function Login(){
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(()=>{
    // 既にログインしている場合はリダイレクト
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if(isLoggedIn === 'true') {
      navigate('/');
    }
  },[]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if(password === ADMIN_PASSWORD) {
      localStorage.setItem('isLoggedIn', 'true');
      navigate('/');
    } else {
      setError('パスワードが正しくありません。');
    }
  }

  return (
    <form onSubmit={onSubmit} style={{maxWidth: 420, margin:'48px auto'}}>
      <h2>管理者ログイン</h2>
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        <input 
          type="password" 
          placeholder="パスワード" 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          required 
        />
        <button type="submit">ログイン</button>
        {error && <div style={{color:'crimson', whiteSpace:'pre-wrap'}}>{error}</div>}
        <p style={{fontSize:12, opacity:0.7}}>※ 管理者パスワードを入力してください。</p>
      </div>
    </form>
  );
}
