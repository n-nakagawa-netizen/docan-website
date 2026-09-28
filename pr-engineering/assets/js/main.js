(function(){
  // 計測（GA4 の gtag が読み込まれているときだけ送る）
  function track(name, params){
    if(typeof window.gtag==="function") window.gtag("event", name, params||{});
  }
  document.querySelectorAll('a[href="#request"]').forEach(function(a){
    a.addEventListener("click",function(){ track("cta_click",{cta_text:a.textContent.trim()}); });
  });

  // 資料請求フォーム（Formspree へ送信。docaninc.com のお問い合わせと同じ仕組み）
  var f=document.getElementById("request-form"), msg=document.getElementById("request-msg");
  var submitBtn=f.querySelector('button[type="submit"]');
  function isEmpty(i){ return i.type==="checkbox" ? !i.checked : !i.value.trim(); }
  function show(text, isError){
    msg.hidden=false;
    msg.classList.toggle("is-error", !!isError);
    msg.textContent=text;
  }
  f.querySelectorAll("[required]").forEach(function(i){
    i.addEventListener(i.type==="checkbox" ? "change" : "input", function(){
      if(!isEmpty(i)) i.removeAttribute("aria-invalid");
    });
  });
  f.addEventListener("submit",function(e){
    e.preventDefault();
    var req=[].slice.call(f.querySelectorAll("[required]"));
    req.forEach(function(i){ i.removeAttribute("aria-invalid"); });
    var miss=req.filter(isEmpty);
    var em=document.getElementById("f-email");
    if(miss.length){
      miss.forEach(function(i){ i.setAttribute("aria-invalid","true"); });
      show("未入力の必須項目があります："+miss.map(function(i){return i.dataset.label;}).join("、"), true);
      miss[0].focus(); return;
    }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value)){
      em.setAttribute("aria-invalid","true");
      show("メールアドレスの形式を確認してください。", true); em.focus(); return;
    }

    submitBtn.disabled=true;
    show("送信しています…");
    fetch(f.action,{method:"POST",body:new FormData(f),headers:{Accept:"application/json"}})
      .then(function(res){
        if(res.ok) return;
        return res.json().catch(function(){return {};}).then(function(data){
          var detail=(data.errors||[]).map(function(x){return x.message;}).filter(Boolean).join(" / ");
          throw new Error(detail || ("HTTP "+res.status));
        });
      })
      .then(function(){
        track("generate_lead",{form_id:"request-form"});
        f.reset();
        show("お申し込みありがとうございます。内容を確認のうえ、ご入力いただいたメールアドレス宛に担当者より資料をお送りします。");
        msg.setAttribute("tabindex","-1"); msg.focus();
      })
      .catch(function(err){
        show("送信できませんでした（"+err.message+"）。通信環境をご確認のうえ、もう一度お試しください。解決しない場合は info@docaninc.com までご連絡ください。", true);
      })
      .then(function(){ submitBtn.disabled=false; });
  });

  // Wave canvas — ripple contour lines (波及)
  var hero=document.querySelector(".hero"), cv=document.getElementById("wave"), ctx=cv.getContext("2d");
  var reduceMq=window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkMq=window.matchMedia("(prefers-color-scheme: dark)");
  var w,h,dpr,t=0,col,raf=0,visible=true;
  function readColor(){ col=getComputedStyle(document.documentElement).getPropertyValue("--wave").trim()||"#2C6A80"; }
  function size(){dpr=Math.min(window.devicePixelRatio||1,2);w=cv.clientWidth;h=cv.clientHeight;cv.width=w*dpr;cv.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  function draw(){
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle=col;
    var lines=22, x0=w*0.35;
    for(var i=0;i<lines;i++){
      var base=h*0.18+i*(h*0.8/lines);
      ctx.globalAlpha=0.05+0.16*(i/lines);
      ctx.lineWidth=1;
      ctx.beginPath();
      for(var x=x0;x<=w+10;x+=8){
        var k=(x-x0)/(w-x0);
        var y=base+Math.sin(x*0.006+t+i*0.35)*18*k+Math.sin(x*0.013-t*0.7+i*0.2)*9*k;
        if(x===x0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  function loop(){t+=0.004;draw();raf=requestAnimationFrame(loop);}
  // 画面外・タブ非表示・動きを減らす設定のときは止める
  function update(){
    var run=visible && !document.hidden && !reduceMq.matches;
    if(run && !raf) raf=requestAnimationFrame(loop);
    if(!run && raf){ cancelAnimationFrame(raf); raf=0; }
  }
  readColor();size();draw();
  window.addEventListener("resize",function(){size();draw();});
  document.addEventListener("visibilitychange",update);
  function onMq(mq,fn){ mq.addEventListener ? mq.addEventListener("change",fn) : mq.addListener(fn); }
  onMq(reduceMq,update);
  onMq(darkMq,function(){readColor();draw();});
  if("IntersectionObserver" in window){
    new IntersectionObserver(function(entries){ visible=entries[0].isIntersecting; update(); }).observe(hero);
  }
  update();
})();
