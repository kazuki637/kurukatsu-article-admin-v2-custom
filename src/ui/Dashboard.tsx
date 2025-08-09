
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { Article } from '../types';

export default function Dashboard(){
  const [items, setItems] = useState<(Article & {id:string})[]>([]);
  const [qText, setQText] = useState('');
  const navigate = useNavigate();

  useEffect(()=>{
    const loginStatus = localStorage.getItem('isLoggedIn');
    if(loginStatus !== 'true') {
      navigate('/login');
    }
  },[]);

  useEffect(()=>{
    (async()=>{
      const col = collection(db, 'articles');
      const qs = [orderBy('updatedAt','desc'), limit(100)];
      const qRef = query(col, ...qs as any);
      const snap = await getDocs(qRef);
      const data = snap.docs.map(d => ({id: d.id, ...(d.data() as any)}));
      setItems(data);
    })();
  },[]);

  const filtered = useMemo(()=>{
    return items.filter(it => {
      const t = (it.title ?? '') + ' ' + (it.subtitle ?? '');
      const okText = t.toLowerCase().includes(qText.toLowerCase());
      return okText;
    });
  },[items, qText]);

  const onDelete = async (id: string) => {
    if(!confirm('この記事を削除しますか？')) return;
    await deleteDoc(doc(db,'articles',id));
    setItems(prev => prev.filter(p=>p.id!==id));
  }

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <input placeholder="検索（タイトル・タグ）" value={qText} onChange={e=>setQText(e.target.value)} />
        <Link to="/new"><button>新規作成</button></Link>
      </div>
      <table style={{width:'100%', borderCollapse:'collapse'}}>
        <thead>
          <tr>
            <th style={{textAlign:'left', borderBottom:'1px solid #ddd'}}>タイトル</th>
            <th style={{textAlign:'left', borderBottom:'1px solid #ddd'}}>サブタイトル</th>
            <th style={{textAlign:'left', borderBottom:'1px solid #ddd'}}>更新日</th>
            <th style={{borderBottom:'1px solid #ddd'}}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(it => (
            <tr key={it.id}>
              <td style={{padding:'8px 0'}}>{it.title}</td>
              <td>{it.subtitle}</td>
              <td>{it.updatedAt?.toDate?.().toLocaleString?.() ?? '-'}</td>
              <td style={{textAlign:'right'}}>
                <Link to={`/edit/${it.id}`}><button>編集</button></Link>
                <button onClick={()=>onDelete(it.id)} style={{marginLeft:8}}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
