
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import type { Article, ArticleStatus, Block } from '../types';
import { marked } from 'marked';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { enforceAspectAndCompress, compressImageKeepAspect } from '../image';

export default function Edit(){
  const params = useParams();
  const navigate = useNavigate();
  const isNew = !params.id || params.id === 'new';

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [headerUrl, setHeaderUrl] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null); // ヘッダー画像のファイルオブジェクトを保存

  // サブタイトルの最大文字数
  const SUBTITLE_MAX_LENGTH = 100;

  useEffect(()=>{
    const loginStatus = localStorage.getItem('isLoggedIn');
    if(loginStatus !== 'true') {
      navigate('/login');
    }
  },[]);

  useEffect(()=>{
    (async()=>{
      if(!isNew){
        const snap = await getDoc(doc(db,'articles', params.id!));
        if(snap.exists()){
          const d = snap.data() as any;
          setTitle(d.title ?? '');
          setSubtitle(d.subtitle ?? '');
          setHeaderUrl(d.headerUrl ?? '');
          
          // クルカツアプリのデータ構造からブロックを再構築
          let blocks: Block[] = [];
          
          // blocks配列が存在する場合はそれを使用
          if (d.blocks && Array.isArray(d.blocks)) {
            console.log('blocks配列を使用:', d.blocks);
            blocks = d.blocks;
          } else {
            // 後方互換性のため、段落と画像を別々に読み込み
            console.log('後方互換性モード: 段落と画像を別々に読み込み');
            
            // 段落データを読み込み
            let paragraphIndex = 1;
            while (d[`paragraph${paragraphIndex}`]) {
              blocks.push({
                type: 'paragraph',
                text: d[`paragraph${paragraphIndex}`]
              });
              paragraphIndex++;
            }
            
            // 画像データを読み込み（imageFilesがある場合）
            if (d.imageFiles && Array.isArray(d.imageFiles)) {
              for (const imageFile of d.imageFiles) {
                try {
                  const imagePath = `articles/${d.title}/images/${imageFile}`;
                  const imageRef = ref(storage, imagePath);
                  const imageUrl = await getDownloadURL(imageRef);
                  blocks.push({
                    type: 'image',
                    url: imageUrl,
                    fileName: imageFile // ファイル名も保存
                  });
                } catch (error) {
                  console.error('Error loading image:', error);
                }
              }
            }
          }
          
          setBlocks(blocks.length > 0 ? blocks : []);
        }
      }
    })();
  },[params.id]);

  // コンポーネントがアンマウントされる際にローカルURLをクリーンアップ
  useEffect(() => {
    return () => {
      // ローカルURLが存在する場合はクリーンアップ
      if (headerUrl && headerUrl.startsWith('blob:')) {
        URL.revokeObjectURL(headerUrl);
      }
    };
  }, [headerUrl]);

  // blocksの状態変更を監視
  useEffect(() => {
    console.log('blocks状態変更:', { length: blocks.length, blocks });
  }, [blocks]);

  // クルカツアプリと同じレイアウトのプレビューを生成
  const previewContent = useMemo(() => {
    console.log('プレビュー更新:', { blocksLength: blocks.length, blocks });
    return {
      title,
      subtitle,
      date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }),
      blocks,
      headerUrl
    };
  }, [title, subtitle, blocks, headerUrl]);

  const onPickHeader = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if(!f) return;
    
    try{
      // ファイル選択時に即座にプレビューを表示
      const localUrl = URL.createObjectURL(f);
      setHeaderUrl(localUrl);
      
      // ファイルオブジェクトを保存（後でアップロード時に使用）
      setHeaderFile(f);
    }catch(err: any){
      console.error('ヘッダー画像選択エラー:', err);
      alert(err.message || String(err));
    }
  };

  const addParagraph = () => setBlocks(prev => [...prev, {type:'paragraph', text:''}]);
  const addImage = async (file?: File) => {
    if(!file) return;
    
    // タイトルが空の場合は警告を表示
    if (!title.trim()) {
      alert('画像を追加する前にタイトルを入力してください');
      return;
    }
    
    try{
      const blob = await compressImageKeepAspect(file);
      // クルカツアプリの期待するパス構造: articles/記事タイトル/images/ファイル名
      const articleTitle = title || (isNew ? 'temp' : params.id!);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
      const path = `articles/${articleTitle}/images/${fileName}`;
      console.log('画像アップロード開始:', { path, fileName });
      
      const r = ref(storage, path);
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(r);
      console.log('画像アップロード完了:', { url, fileName });
      
      setBlocks(prev => [...prev, {type:'image', url, fileName}]);
    }catch(err:any){
      console.error('画像アップロードエラー:', err);
      alert(`画像のアップロードに失敗しました: ${err.message || String(err)}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addImage(file);
    }
    // ファイル選択をリセット（同じファイルを再度選択できるように）
    e.target.value = '';
  };

  const move = (idx: number, dir: -1|1) => {
    console.log('move関数実行:', { idx, dir, currentBlocks: blocks });
    setBlocks(prev => {
      const next = [...prev];
      const j = idx + dir;
      if(j<0 || j>=next.length) {
        console.log('move関数: 範囲外のため変更なし');
        return prev;
      }
      // 配列の要素を交換
      [next[idx], next[j]] = [next[j], next[idx]];
      console.log('move関数完了:', { next });
      return next;
    });
  }

  const removeAt = (idx: number) => setBlocks(prev => prev.filter((_,i)=>i!==idx));

  // バリデーション関数
  const validateForm = () => {
    console.log('バリデーション開始:', { title: title.trim(), subtitle: subtitle.trim(), headerUrl, headerFile });
    
    if (!title.trim()) {
      console.log('タイトルが空です');
      setMsg('タイトルは必須です');
      return false;
    }
    if (!subtitle.trim()) {
      console.log('サブタイトルが空です');
      setMsg('サブタイトルは必須です');
      return false;
    }
    if (subtitle.length > SUBTITLE_MAX_LENGTH) {
      console.log('サブタイトルが長すぎます:', subtitle.length);
      setMsg(`サブタイトルは${SUBTITLE_MAX_LENGTH}文字以内で入力してください`);
      return false;
    }
    if (!headerUrl && !headerFile) {
      console.log('ヘッダー画像がありません');
      setMsg('ヘッダー画像は必須です');
      return false;
    }
    console.log('バリデーション成功');
    return true;
  };

  const onSave = async () => {
    console.log('onSave開始:', { title, subtitle, headerUrl, headerFile });
    setLoading(true);
    setMsg(null);
    
    // 認証状態を確認
    const loginStatus = localStorage.getItem('isLoggedIn');
    if (loginStatus !== 'true') {
      console.error('ユーザーが認証されていません');
      setMsg('ユーザーが認証されていません。ログインしてください。');
      setLoading(false);
      return;
    }
    console.log('認証済みユーザー: 管理者');
    
    // バリデーション
    if (!validateForm()) {
      console.log('バリデーション失敗');
      setLoading(false);
      return;
    }
    console.log('バリデーション成功');

    try{
      // ヘッダー画像がある場合はアップロード
      let finalHeaderUrl = headerUrl;
      if (headerFile) {
        console.log('ヘッダー画像アップロード開始');
        try {
          const blob = await enforceAspectAndCompress(headerFile);
          const articleTitle = title || (isNew ? 'temp' : params.id!);
          const path = `articles/${articleTitle}/header`;
          const r = ref(storage, path);
          await uploadBytes(r, blob, { contentType: 'image/jpeg' });
          finalHeaderUrl = await getDownloadURL(r);
          setHeaderUrl(finalHeaderUrl);
          setHeaderFile(null); // アップロード完了後はクリア
          console.log('ヘッダー画像アップロード完了:', finalHeaderUrl);
        } catch (err: any) {
          console.error('ヘッダー画像アップロードエラー:', err);
          alert(`ヘッダー画像のアップロードに失敗しました: ${err.message || String(err)}`);
          setLoading(false);
          return;
        }
      }

      // クルカツアプリの期待するデータ構造に変換
      const articleData: any = {
        title,
        subtitle,
        date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'published', // 常にpublishedステータスで保存
        headerUrl: finalHeaderUrl, // ヘッダー画像URLを保存
        blocks: blocks, // blocksの順序を保持して保存
      };

      // 後方互換性のため、段落データもparagraph1, paragraph2, ...の形式で保存
      let paragraphIndex = 1;
      const imageFiles: string[] = [];
      
      for (const block of blocks) {
        if (block.type === 'paragraph') {
          if (block.text.trim()) {
            articleData[`paragraph${paragraphIndex}`] = block.text;
            paragraphIndex++;
          }
        } else if (block.type === 'image') {
          console.log('画像ブロック:', block);
          // fileNameプロパティがある場合はそれを使用、ない場合はURLから抽出
          if (block.fileName) {
            console.log('保存されたファイル名を使用:', block.fileName);
            imageFiles.push(block.fileName);
          } else {
            const url = block.url;
            console.log('画像URL:', url);
            
            // URLからファイル名を抽出
            let fileName = '';
            
            // Firebase Storage URLの場合
            if (url.includes('firebasestorage.googleapis.com')) {
              // URLの最後の部分からファイル名を抽出
              const urlParts = url.split('/');
              fileName = urlParts[urlParts.length - 1];
              // クエリパラメータがある場合は除去
              fileName = fileName.split('?')[0];
            } else {
              // その他のURLの場合
              fileName = url.split('/').pop() || '';
              fileName = fileName.split('?')[0];
            }
            
            console.log('抽出されたファイル名:', fileName);
            imageFiles.push(fileName);
          }
        }
      }
      
      if (imageFiles.length > 0) {
        articleData.imageFiles = imageFiles;
        console.log('保存する画像ファイル名:', imageFiles);
      } else {
        console.log('画像ファイルが見つかりません');
      }

      console.log('保存するデータ:', articleData);

      if(isNew){
        console.log('新規記事として保存');
        const docRef = await addDoc(collection(db,'articles'), articleData);
        console.log('新規記事保存完了:', docRef.id);
      }else{
        console.log('既存記事を更新:', params.id);
        await updateDoc(doc(db,'articles', params.id!), articleData);
        console.log('記事更新完了');
      }
      setMsg('保存しました');
      if(isNew) navigate('/');
    }catch(err: any){
      console.error('保存エラー:', err);
      setMsg(`保存に失敗しました: ${err.message || String(err)}`);
    }finally{
      setLoading(false);
    }
  };

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
      <div>
        <div style={{display:'flex', gap:8}}>
          <Link to="/"><button>← 一覧へ</button></Link>
          <button disabled={loading} onClick={()=>onSave()}>公開</button>
        </div>
        {msg && <div style={{marginTop:8, color: msg.includes('必須') || msg.includes('文字以内') ? '#d32f2f' : '#0a7'}}> {msg} </div>}
        <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:16}}>
          <label>タイトル <span style={{color: '#d32f2f'}}>*</span>
            <input 
              value={title} 
              onChange={e=>setTitle(e.target.value)} 
              placeholder="タイトル（必須）" 
              style={{
                borderColor: !title.trim() ? '#d32f2f' : undefined
              }}
            />
            {!title.trim() && <div style={{color: '#d32f2f', fontSize: '12px', marginTop: '4px'}}>タイトルは必須です</div>}
          </label>
          <label>サブタイトル <span style={{color: '#d32f2f'}}>*</span>
            <div style={{position: 'relative'}}>
              <input 
                value={subtitle} 
                onChange={e=>setSubtitle(e.target.value)} 
                placeholder="サブタイトル（必須）" 
                style={{
                  borderColor: !subtitle.trim() ? '#d32f2f' : subtitle.length > SUBTITLE_MAX_LENGTH ? '#f57c00' : undefined
                }}
              />
              <div style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                color: subtitle.length > SUBTITLE_MAX_LENGTH ? '#d32f2f' : '#666'
              }}>
                {subtitle.length}/{SUBTITLE_MAX_LENGTH}
              </div>
            </div>
            {!subtitle.trim() && <div style={{color: '#d32f2f', fontSize: '12px', marginTop: '4px'}}>サブタイトルは必須です</div>}
            {subtitle.length > SUBTITLE_MAX_LENGTH && <div style={{color: '#d32f2f', fontSize: '12px', marginTop: '4px'}}>サブタイトルは{SUBTITLE_MAX_LENGTH}文字以内で入力してください</div>}
          </label>
          <label>ヘッダー画像（16:9・1MB以下） <span style={{color: '#d32f2f'}}>*</span>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={onPickHeader}
                style={{
                  borderColor: (!headerUrl && !headerFile) ? '#d32f2f' : undefined
                }}
              />
              {headerUrl && <a href={headerUrl} target="_blank">プレビュー</a>}
            </div>
            {(!headerUrl && !headerFile) && <div style={{color: '#d32f2f', fontSize: '12px', marginTop: '4px'}}>ヘッダー画像は必須です</div>}
          </label>
          <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
            <button onClick={addParagraph}>＋ 段落を追加</button>
            <label style={{display:'inline-flex', gap:8, alignItems:'center'}}>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={handleImageUpload} />
              <span className="btn-like" style={{border:'1px solid #ccc', padding:'8px 10px', borderRadius:8, cursor:'pointer'}}>＋ 画像を追加</span>
            </label>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:8}}>
            {blocks.map((b, i)=>(
              <div key={i} style={{border:'1px solid #e5e5e5', borderRadius:8, padding:12}}>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginBottom:8}}>
                  <button onClick={()=>move(i,-1)}>↑</button>
                  <button onClick={()=>move(i,1)}>↓</button>
                  <button onClick={()=>removeAt(i)}>削除</button>
                </div>
                {b.type==='paragraph' ? (
                  <textarea
                    value={b.text}
                    onChange={e=>{
                      const v = e.target.value;
                      setBlocks(prev => prev.map((x,idx)=> idx===i ? {...x, text: v} as Block : x));
                    }}
                    rows={6}
                    placeholder="本文（プレーンテキスト。*や#等のMarkdown記法も一部対応）"
                    style={{width:'100%'}}
                  />
                ) : (
                  <div>
                    <img src={b.url} style={{maxWidth:'100%', height:'auto', borderRadius:8}} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div style={{fontWeight:600, marginBottom:8}}>プレビュー（クルカツアプリ表示）</div>
        <div style={{
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {/* ヘッダー画像 */}
          {previewContent.headerUrl && previewContent.headerUrl.trim() !== '' && (
            <div style={{
              width: '100%',
              height: '0',
              paddingBottom: '56.25%', // 16:9の比率 (9/16 = 0.5625 = 56.25%)
              position: 'relative',
              overflow: 'hidden'
            }}>
              <img 
                src={previewContent.headerUrl} 
                alt="ヘッダー画像"
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
              />
            </div>
          )}
          
          {/* 記事内容 */}
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            marginTop: (previewContent.headerUrl && previewContent.headerUrl.trim() !== '') ? '-20px' : '0',
            minHeight: '100%',
            position: 'relative',
            zIndex: 1
          }}>
            {/* タイトル */}
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>
              {previewContent.title || 'タイトル'}
            </h1>
            
            {/* サブタイトル */}
            {previewContent.subtitle && (
              <div style={{
                fontSize: '16px',
                color: '#666',
                marginBottom: '8px'
              }}>
                {previewContent.subtitle}
              </div>
            )}
            
            {/* 日付 */}
            {previewContent.date && (
              <div style={{
                fontSize: '14px',
                color: '#999',
                marginBottom: '20px'
              }}>
                {previewContent.date}
              </div>
            )}
            
            {/* 区切り線 */}
            <div style={{
              height: '1px',
              backgroundColor: '#e0e0e0',
              margin: '20px 0'
            }} />
            
            {/* 段落コンテンツ */}
            {previewContent.blocks.map((block, index) => (
              <div key={index} style={{ marginBottom: '20px' }}>
                {block.type === 'paragraph' ? (
                  <p style={{
                    fontSize: '16px',
                    lineHeight: '24px',
                    color: '#333',
                    marginBottom: '15px',
                    margin: '0 0 15px 0',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {block.text || '段落の内容がここに表示されます'}
                  </p>
                ) : (
                  <div style={{
                    width: '100%',
                    marginTop: '10px',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={block.url} 
                      alt="コンテンツ画像"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: '8px',
                        maxHeight: '400px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
