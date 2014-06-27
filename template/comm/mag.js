
/*

使用方法：

1、注册必要的hook，如

     onPageReady    当数据准备好可以开始绘制时会调用


2、初始化

 MAG.init();

        初始化通常无需参数，也可以做这些设置
         {
         pageWidth  :   输出页面的宽度，单位是 pt ，可用 MAG.getPtPxRatio 方法得到pt和px的比率
         pageHeight :   输出页面的高度，其他说明同宽度
         minItmNum  :   每页最小排多少条
         maxItmNum  :   每页最多排多少条
         }

3、载入数据

方法一：从服务器读取

 MAG.loadData(sUrl);

        sUrl：服务器上的数据地址，无需加上代理。如  http://rss.bitauto.com/src/a-0.xml

方法二：装入已有的数据

 MAG.appendData(sUrl,odat);

        sUrl：服务器源数据地址
        odat：如果希望用已经装载的数据，可以在这里传入，将不再执行到服务器取数据的过程

    MAG.appendData 具有如下返回值

    {
    sUrl        :   数据源地址
    isNext      :   这是否是某数据源的下一批数据
    fastlink    :   如果这是某数据源的下一批数据，此值存在，值为这批数据在服务器上的地址
    next        :   本批数据对应的下一批数据地址
    }



其他：

载入更多数据（nextpage）

     MAG.loadNextData(sUrl);

             sUrl：数据源地址，注意：不是数据里面的fastlink。会自动根据sUrl里面记录的nextpage数据地址装载

     也可以用 MAG.appendData 载入，此时地址仍然是数据源地址，会将这些数据合并到已有 sUrl 对应的数据中

清空数据

    MAG.emptyData(sUrl)

            sUrl：数据源地址，注意：不是数据里面的fastlink。清理的是sUrl对应的所有排版数据




4、获取页面HTML

 MAG.getPageHTML(sUrl,opr);

         可用参数，这些都不是必须的：
         {

         start  ：   起始页，从0开始计数
                        不指定就是第 0 页
         end    ：   结束页
                        如果不提供，则默认为只取出起始页，如果以上两项都不提供，则取出全部页面

         w      ：   输出页面宽度，以pt为单位
         h      ：   输出页面高度，以pt为单位
                        以上两项不指定会用默认的页面尺寸（自动测得的页面可见区域大小，或init时候设定）

         }


    返回每页数组

        [
            pn      ：   页码（从0开始）
            html    ：   HTML文本，直接写入页面容器即可获得排版效果
        ]

 注意，如果是从服务器上现装载数据，需注册个 onPageReady hook，当数据装载准备好后再开始绘制页面



其他有用的方法

    MAG.getTotalPageNumber(sUrl)    查询某个已装载数据的数据源被排了几页

        返回值     总页数,返回 -1 表示该链接没有装载过


    MAG.getPtPxRatio()  获取当前设备 pt 尺寸和 px 尺寸的比例关系

        返回值
            {
            x   :   横向比例
            y   :   纵向比例
            }





还可以利用 hook ，在某些情况下进行补充操作

目前支持的 hook

 onDataLoad     当使用 MAG.loadData 方法，通过服务器装载数据时，数据装载后会调用这个函数
             将传入的参数有：
             参数1：   装载出来的数据
             参数2：   数据源的地址
             参数3：   调用 MAG.loadData  时给的地址



 onPageReady    页面数据已经准备好，可以开始用 MAG.getPageHTML 方法绘制了

            将传入的参数有
            参数1：    数据源地址
            参数2：    总页数


 constructPageDIV   构造整页HTML的时候，会调用这个hook

            将传入的参数有
            参数1：    整页HTML字符串
            参数2：    当前是第几页

    使用这个hook必须返回值，内容是修改后的HTML字符串
    如果是设置id、onclcik动作等属性，可以替换 {$attributes$} ，如
     s.replace(/\{\$attributes\$\}/, myAtt);


 constructBlockDIV  构造条目块HTML的时候，回调用这个hook

             将传入的参数有
             参数1：    整个区块HTML字符串
             参数2：    区块相关信息，目前有
                {
                link：   条目对应的文章网址链接
                w   ：   条目有效宽度
                h   ：   条目有效高度
                }

     使用这个hook必须返回值，内容是修改后的HTML字符串
     如果是设置id、onclcik动作等属性，可以替换 {$attributes$} ，如
     s.replace(/\{\$attributes\$\}/, myAtt);



 */



var MAG = {
    hooks:{}//各类钩子
};



MAG.cfg = {
    "minItmNum" : 3,
    "maxItmNum" : 6,
    "mainBlock" : false, //是否需要大面积主区块，主要适用于phone，会自动设置
    "ApAsRatio":0.2, //判断图片长宽比是否合适的参数
    "css3":true,
    "units":'pt',
    "proxyUrl":'http://61.155.178.182:8089/'};

//以条目link为key，存放条目内容
MAG.data = {};
//所有页排版信息
MAG.links = {};




/*
初始化排版数据

开始排版前，需要先传入相关数据，初始化相关参数

minItm：每页最少排多少个条目，不少于一个
maxItm：每页最多排多少个条目，最多不会超出网格总数
pW：目标排版页面区域宽度
pH：目标排版页面区域高度

*/

MAG.init = function(ocfg){

    MAG.sty = {
        // 字体样式设置支持以css字体样式名和相应值，字号、行高等尺寸单位应为 pt 值
        "title":{"font-size":22,"line-height":'130%',"color":"#000000","letter-spacing":0,"font-family":'Sans-serif'},
        "vtit" : {"minLen":8, //如果标题能排的字数小于此值，将用浏览器自动换行替代换行算法
            "minLenPage":18,  //如果每页最小边能显示的标题字数小于此值，将自动调整标题默认字号
            "topPadding":0, //如果可能，在标题上方留出空白，单位是基于正文字号的比值
            "oitTitleCSS":'color:#FFFFFF;text-shadow: 0 0 10pt #333333;font-family:Sans-serif;',  //标题在图片上时，标题文字的样式
            "oitBackgroundCSS" : 'background-color:rgba(0,0,0,0.4);',//图片上写文字时，标题背景样式
            "oitPadding":0.5, //标题在图片上时的留白
            "minFontSize":10.5},//标题最小的字号
        "text":{"font-size":12,"line-height":'150%',"letter-spacing":0,"color":"#333333","font-family":'Serif'},
        "textMinLenPage":26, //如果每页最小边能显示的正文字数小于此值，将自动调整默认正文字号
        "textMinFontSize":9, //正文最小的字号
        "textMinLenBlock":10, //块中最少放多少字，小于此值就不放文字了
        "textMinRowBlock":2, //块中最少放多少行，小于此值就不放文字了
        "minLenPerCol" : 15, //分栏排文章的时候，每栏最小字数
        "maxLenPerCol" : 30, //分栏排文章的时候，每栏最大字数
        "minRowPerCol" : 2, //分栏排文章的时候，每栏最小行数
        "note":{"font-size":10,"line-height":'150%',"letter-spacing":0,"color":"#a0a0a0","font-family":'Serif'},
        "noteMinFontSize":8, //时间等注释性信息最小的字号
        "textLine" : '<div style="text-align:left;margin:0;padding:0;{$textStyle$}">{$content$}</div>',
        "cleanDIV" : 'padding:0;margin:0;display:block;border:0px;vertical-align: middle;overflow:hidden;',
        "listBlockPadding" :0.75, //基于正文字号的比值
        "listDescColor" : '#808080',
        "listBlockDIV" : '<div style="display:block;{$blockCSS$}" + {$attributes$} >{$blockHTML$}</div>',
        "imageBgCSS" : ';background:url({$imageSrc$}) no-repeat 38% 38%;-moz-background-size:cover;background-size:cover;',
        "splitLine" : '1px solid #e8e8e8;',
        //页边留白，是页面最小边的百分比
        "pagePadding" : 1 ,//基于正文字号的比值
        //用于识别换行的正则
        "newline" : '[,|;|:|?|!|，|。|；|：|？|！|\\—\\—|…|》|……|）]', //优先换行
        "newline2" : '[\\r|“|”|《]'        //次优先换行
    };

    //先给出一些京调校的默认数据
    MAG.cfg.minItmNum = 3;
    MAG.cfg.maxItmNum = 6;
    MAG.cfg.mainBlock = false; //是否需要大面积主区块，主要适用于phone，会自动设置

    //用传入数替代默认配置
    if(ocfg){
        for(var o in ocfg){
            MAG.cfg[o] = ocfg[o];
        }
    }


    // 排版用到物理尺寸，因此需测试出屏幕中pt与px的换算关系
    var rd = MAG.getPtPxRatio(MAG.cfg.units);
    //单位对应关系
    MAG.cfg.PtPxRatio = rd;


    //目标页面宽度
    if(!MAG.cfg.pageWidth){
        MAG.cfg.pageWidth = document.documentElement.clientWidth * rd.x;
    }
    //目标页面高度
    if(!MAG.cfg.pageHeight){
        MAG.cfg.pageHeight = document.documentElement.clientHeight * rd.y;
    }




    var pd = MAG.getRelativeFontSize(MAG.sty.pagePadding);
    //如果默认的字号太大，修正之
    var minS = Math.min(MAG.cfg.pageHeight,MAG.cfg.pageWidth) - pd*2;
    var ns;
    if(minS / MAG.sty.text['font-size'] < MAG.sty.textMinLenPage){
        ns = minS / MAG.sty.textMinLenPage;
        // 如果字号小于最小正文字号，修正之
        if(ns < MAG.sty.textMinFontSize)
            ns = MAG.sty.textMinFontSize;
        MAG.sty.text['font-size'] = Math.round(ns);
    }

    if(minS / MAG.sty.title['font-size'] < MAG.sty.vtit.minLenPage){
        ns = minS / MAG.sty.vtit.minLenPage;
        // 如果标题字号小于默认正文字号，修正之
        if(ns < MAG.sty.text['font-size'])
            ns = MAG.sty.text['font-size'];
        MAG.sty.title['font-size'] = Math.round(ns);
    }

    //phone等小尺寸设备，不够两列分栏的
    if(minS / MAG.sty.textMinFontSize < MAG.sty.minLenPerCol * 2.5){
        MAG.sty.note['font-size'] = MAG.sty.noteMinFontSize;
        //页边留白缩小
        MAG.sty.pagePadding = MAG.sty.pagePadding/2;
        //每页有个主题文章
        MAG.cfg.mainBlock = true;
    }

    //有主题文章的时候，每页最大条目数减一，以避免拥挤
    if(MAG.cfg.mainBlock && MAG.cfg.maxItmNum > 2){
        MAG.cfg.maxItmNum --;
    }

    //再计算一次页边留白，得出排版版心大小
    pd = MAG.getRelativeFontSize(MAG.sty.pagePadding);
    MAG.cfg.corePart = {w:MAG.cfg.pageWidth - 2*pd,h:MAG.cfg.pageHeight};


};

MAG.setStyle = function(ost){

    //用传入数替代默认配置
    if(ost){
        for(var o in ost){
            MAG.sty[o] = ost[o];
        }
    }


};

MAG.getRelativeFontSize = function(v,optFontSty){

    //默认用正文字号尺寸
    if(!optFontSty || !MAG.sty[optFontSty])
        optFontSty = 'text';

    var fs = MAG.sty[optFontSty]['font-size'];

    if(typeof(v)!='number')
        v = 1;

    return Math.round(fs*v);

};



MAG.sty_getCssStr = function(stid,orpl){
    var o = MAG.sty[stid];
    if(!o)
        return "";
    if(!orpl)
        orpl = {};
    var ts = ";";
    var v;
    for(var n in o){
        v = o[n];
        if(typeof(orpl[n])!='undefined')
            v = orpl[n];
        if(!v || v == '')
            continue;
        ts += n +':'+v+(typeof(v)=='number' ? MAG.cfg.units : '') + ';' ;
    }
    return ts;
};

/*

添加需要排版的数据

*/

MAG.appendData = function(link,odat){

    if(!odat)
        return null;

    var rv = {};

    rv.sUrl = link;
    var isNext = false;

    //没有连接记录
    if(!MAG.links[link]){
        var ol;
        //看看这个链接是否某链接的下一页
        for(var d in MAG.links){
            ol = MAG.links[d];
            if(ol.next == link){
                isNext = true;
                rv.sUrl = d;
                rv.fastlink = link;
                link = d;
                break;
            }
        }
        //不是就创建一个新的链接记录
        if(!isNext){
            MAG.links[link] = {'pages':[]};
        }
        MAG.lastLoadLink = link;
    }

    rv.isNext = isNext;



    //记下这个链接的下一页地址
    MAG.links[link].next = odat.nextpage;

    rv.next = odat.nextpage;

    if(odat.type == 'list'){
        MAG.appendListData(odat.data,MAG.links[link]);
    }

    //调用hook
    if(typeof(MAG.hooks['onPageReady']) == 'function'){
        var runs = "MAG.hooks['onPageReady']('"+link+"',"+MAG.links[link].pages.length+")";
        //延时的目的是跳开调用流程
        window.setTimeout( runs ,10);
    }

    return rv;

};

MAG.appendListData = function(aLst,olnk){

    if( !aLst || !aLst.length)
        return false;


/*
     计算出需要排多少页，每页排多少条目
     */


    //按时间给数据排序
    //aLst = aLst.sort( function(a,b){return Number(a.pubDate) < Number(b.pubDate) } );

    //平均每页排多少个条目，条目太少就只排一页
    var avg = (MAG.cfg.maxItmNum > aLst.length ? aLst.length :  Math.round(MAG.cfg.maxItmNum + MAG.cfg.minItmNum)/2);

    //需要排多少页
    var pn = Math.ceil(aLst.length / avg);
    //如果页数小于1页，修正之
    if(pn < 1)
        pn = 1;

    var tsc = 0;

    for(var i=0;i<aLst.length;i++){
        //计算得分
        aLst[i]._Score = MAG.getListItemScore(aLst[i]);
        //获得所有文章的总分
        tsc += aLst[i]._Score;
    }

    //每页的平均分
    var avsc = tsc/pn;
//    avsc = avsc - avsc/avg;

    //用于存储排版分布结果的数组
    var pgs = new Array(pn);

/*
 将条目数据和页面关联起来，并得出本页总分
     */

    var ts,obj,avi,op,j;
    var t = 0;
    var min = MAG.cfg.minItmNum;
    var max = MAG.cfg.maxItmNum;


    for(var i=0;i<pn;i++){
        //随机为此页分配条目数
        if(i<pn-1)
            avi = Math.floor(Math.random()*(max-min)) + min;
        else
            avi = aLst.length - t; //最后一页，就全分配上
        avsc = tsc / (pn-i);
        ts = 0;

        if(!pgs[i])
            pgs[i] = {'itm':[]};

        op = pgs[i];

        j = 0;
        do{
            obj = aLst[t];
            if(!obj)
                break;
            //记录该条目所在页码
            obj.pageNo = i + olnk.pages.length;
            //记录页中包含的条目key
            pgs[i].itm.push({"id":obj.link,"sc":obj._Score,"pubDate":Number(obj.pubDate)});
            //以link为key存储条目数据
            MAG.data[obj.link] = obj;
            //计算总得分
            ts += obj._Score;

            t ++;
            j ++;
            //如果只有一条了，但总权重仍然很小
            if(j==avi-1 ){
                if( ts/avsc < .5 && avi <= avg){
                    avi ++;
                }
            }else{
                //如果总权重太大了
                if(ts > avsc   )
                    break;
            }

        }while(  j< avi && t < aLst.length && !(pn-i>1 && (aLst.length-t)/(pn-i-1) <= min) ) //留给后面页的条数足够

        //记下本页总分
        pgs[i].sc = ts;
        //存储本页有多少条目
        pgs[i].n = j;

    }

//if( t < aLst.length )
//    alert('err');




    /*
    根据分栏数，确定各条目所在栏位置
     */

    var op,ts,ass;
    var coln = (Math.max(MAG.cfg.pageWidth,MAG.cfg.pageHeight)/Math.max(MAG.cfg.pageWidth,MAG.cfg.pageHeight) >=1.5 ? 3:2);  //MAG.cfg.colNum
    // 循环处理每一页
    for(var i=0;i<pn;i++){
        op = pgs[i];
        //按重要性排序，以便在分栏中合理分布
        ass = op.itm.sort( function(a,b){return a.sc < b.sc } );
        if(MAG.cfg.mainBlock)
            ass[0].isMain = true;
        //依据需要排布的栏数，分布条目
        op = MAG.composPage(op,ass,coln);

        //因已有按栏排布数据，清理掉本页中不再需要的未排布数据
        delete op.itm;

    }


    olnk.pages = olnk.pages.concat(pgs);


    return true;
};

MAG.composPage = function(opg,adat,cNum){

    var ts = opg.sc;
    if(adat.length < cNum)
        cNum = adat.length;

    //创建每个栏目存放的数组
    opg.cols = new Array(cNum);
    var cn = 0;

    //遍历所有条目，分布到各栏中
    for(var i=0;i<adat.length;i++){
        //为新栏创建数据结构
        if( !opg.cols[cn] )
            opg.cols[cn] = {"sc":0,"itms":[]};

        //如果该栏不是最后一栏，并已经有太多权重，就不在该栏中添加了
        if( cn != cNum-1 && opg.cols[cn].sc >= opg.sc/cNum  ){
            i --;
        }else{
            if(adat[i].isMain){
                //加分到超过平均权重
                adat[i].sc = opg.sc/cNum + adat[i].sc*(adat[i].sc/opg.sc)/3;
                opg.hasMain = true;
            }
            //将条目放到相应栏中
            opg.cols[cn].itms.push(adat[i]);
            //累加出该栏各条目共占多少权重
            opg.cols[cn].sc += adat[i].sc;
        }

        //遍历各栏
        if(cn < cNum -1){
            cn ++;
        }else{
            //找出已排好栏中，相对较空的栏目，优先插入后继条目
            opg.cols = opg.cols.sort( function(a,b){ a.sc < b.sc } );
            cn = 0;
        }
    }

    return opg;

};

MAG.getTotalPageNumber = function(sUrl){

    if(!MAG.links[sUrl])
        return -1;

    return MAG.links[sUrl].pages.length;

};

/*

取得指定页的html

参数：
{

 link   ：   从那个链接中数据中生成

 start  ：   起始页，从0开始计数
 end    ：   结束页，如果不提供，则默认为只取出起始页，如果以上两项都不提供，则取出全部页面

 w      ：   输出页面宽度，以pt为单位
 h      ：   输出页面高度，以pt为单位

}


 */

MAG.getPageHTML = function(sUrl,opr){

    if(!opr)
        opr = {};

    if(!sUrl)
        sUrl = MAG.lastLoadLink;

    if( !MAG.links[sUrl] ){
        return false;
    }

    var pgs = MAG.links[sUrl].pages;

    var spn = (opr.start ? opr.start : 0);
    spn = (spn < 0 || spn > pgs.length ? 0 : spn );

    var epn = ( typeof(opr.end) == 'number' ? opr.end : spn+1 );
    epn = (epn > pgs.length || epn < 0 ? pgs.length : (epn <= spn ? spn+1 : epn ) );

    var w = (opr.w ? opr.w : MAG.cfg.pageWidth );
    var h = (opr.h ? opr.h : MAG.cfg.pageHeight );

    var u = MAG.cfg.units;
    var pd = MAG.getRelativeFontSize(MAG.sty.pagePadding);


    //留出留白空间
    w -= pd*2;
    h -= pd*2;

    var rv = [];
    var ts;
    var txtCSS = MAG.sty_getCssStr('text');
    for(var i=spn;i<epn;i++){
        ts = '<div style="clear:both;overflow:hidden; '
            + ';padding:0'+ pd + u
            + ';margin:0'
            + ';width: '+ w + u
            + ';height:'+ h + u
            + ';'+ txtCSS
            + ';" {$attributes$}  >';
        pgs[i].pos = {left:pd,top:pd};
        ts += MAG.getComposHTML(pgs[i],w,h);
        ts += '</div>';
        if(typeof(MAG.hooks['constructPageDIV']) == 'function' ){
            ts = MAG.hooks['constructPageDIV'](ts,i);
        }
        //清理掉替换标记
        ts = ts.replace(/\{\$attributes\$\}/g,'');
        rv.push({"pn":i,"html":ts});
    }

    return rv;
};

MAG.getComposHTML = function(opg,w,h){

    if(!opg)
        return "";
    //如果没有宽高数据，用默认的
    w = (w ? w : MAG.cfg.corePart.w);
    h = (h ? h : MAG.cfg.corePart.h);

    //采用默认的尺寸单位
    var u = MAG.cfg.units;
    var tmp = '<div style=" '+ MAG.sty.cleanDIV +' {$style$}" >{$content$}</div>';
    var ts = "";
    var oc = opg.cols;
    var ss,cs,cw, ch,cNum;
/*
    opg.pos = {
        left:(opg.pos.npos ? opg.pos.npos.left : opg.pos.left),
        top:(opg.pos.npos ? opg.pos.npos.top : opg.pos.top)
    };
*/

    var bs;
    var px = Math.ceil(MAG.cfg.PtPxRatio.x);
    var tw = 0,th = 0;
    //区块大小精度，用于相对整齐划分区块
    var gsz = MAG.sty.vtit.minFontSize;// * 4;
    //允许最大的区块占用的百分比
    var maxper = .618;
    var minper = .33;
    var mbsz = gsz*1.5;

    var bmh = MAG.sty.vtit.minFontSize * 6;
    var bxh = bmh + MAG.sty.minRowPerCol * MAG.sty.textMinFontSize *3;

    var isL = MAG.isLandscape(w,h,opg);
    var coln  = 2;

    for(var i=0;i<oc.length;i++){
        ss = (isL ? ';float:left;':';clear:both;') + 'display:block;';
        cs = '';
        bs = '';
        //求出当前块占目标区域的尺寸
        if(isL){
            if( i==oc.length-1 || oc.length==1 ){
                cw = w - tw; //最后一个就直接填满
            }else{
                //根据权重算出应该占多大区域
                cw = (Math.floor((oc[i].sc/opg.sc)*w/gsz)*gsz);
                //缩小太大的版面占用
                cw = ( cw/w > maxper ? Math.floor(w * maxper) : cw);
                //扩大太小比例的版面占用
                cw = ( cw/w < minper ? Math.ceil(w * minper) : cw);
                //扩大太小尺寸的版面占用
                cw = ( cw < mbsz && w/1.5 >= mbsz ? mbsz : cw);
            }
            tw += cw;
            ch = h;
        }else{
            if( i==oc.length-1  || oc.length==1 ){
                ch = h - th; //最后一个就直接填满
            }else{
                //根据权重算出应该占多大区域
                ch = (Math.floor((oc[i].sc/opg.sc)*h/gsz)*gsz);
                //缩小太大的版面占用
                ch = ( ch/h > maxper ? Math.floor(h * maxper) : ch);
                //扩大太小比例的版面占用
                ch = ( ch/h < minper ? Math.ceil(h * minper) : ch);
                //扩大太小尺寸的版面占用
                ch = ( ch < mbsz && h/1.5 >= mbsz ? mbsz : ch);
                if(ch > bmh && ch < bxh)
                    ch = bmh;

            }
            th += ch;
            cw = w;
        }

        //减去边框用到的一个像素对应的尺寸，以保证float:left正确
//        cw -= px;
//        ch -= px;
        cw --;
        ch --;

/*
        oc[i].pos = { left:opg.pos.left,top:opg.pos.top,npos:{left:opg.pos.left+cw,top:opg.pos.top+ch,isL:isL} };
*/

        if(oc[i].itms && oc[i].itms.length > 1){

            ss += ' width: '+ cw + u + '; height: ' + ch + u + ';';

            if(oc[i].itms.length <= 3 && Math.max(cw,ch)/Math.min(cw,ch) >= 1.5)
                coln = 3;
            else
                coln = 2;

            if(!oc[i].cols){
                //计算出目标区域合适的分栏数
                cNum = (isL ? Math.min(coln,oc[i].itms.length) : Math.min(coln,oc[i].itms.length) );
                //将条目分配到栏中
                oc[i] = MAG.composPage(oc[i],oc[i].itms,cNum);
            }
            //递归去获取新块的分栏结果
            cs = '<div style="'+MAG.sty.cleanDIV+ss+'">'+MAG.getComposHTML(oc[i],cw,ch)+'</div>';


        }else{
            ss += ' width: '+ cw + u + '; height: ' + ch + u + ';';
            cs = '<div style="width:'+cw+u+';height:'+ch+u+';'+MAG.sty.cleanDIV +';" >';
            oc[i].itms[0].pos = {};//{left:oc[i].pos.left,top:oc[i].pos.top}
            cs += MAG.getBlockHTML(oc[i].itms[0],cw,ch);
            cs += '</div>';
        }

        bs = (i > 0  ? 'border-'+ (isL ? 'left:' : 'top:') + MAG.sty.splitLine  : '');
        ss += bs;

        ts += tmp.replace('{$style$}',ss).replace('{$content$}',cs);

    }


    return ts;


};

MAG.isLandscape = function(w,h,opg){

    var n = (opg.cols && opg.cols.length ? opg.cols.length : 1);

    var rv = (w/n > h/n);



    if(!opg.hasMain && w/n/MAG.sty.textMinFontSize < MAG.sty.minLenPerCol)
        rv = (w/n > h/n*1.5);//提高出横条的几率

    return rv;

};

MAG.packagedTitle = function(otit,sc,mg,bw,bwpd){

    if(!mg)
        mg = [0,0,0,0];
    if(!sc)
        sc = 1;

    var w = otit.w;
    var h = otit.h;
    var ts = otit.html;
    var u = MAG.cfg.units;
    var bcss = '';

    if(bw){
        if(typeof(bwpd)!='number')
            bwpd = MAG.sty.text['font-size'];
        ts = '<span style="'+MAG.sty.vtit.oitTitleCSS+';">'+ts+'</span>';
        bcss = MAG.sty.vtit.oitBackgroundCSS + ';padding:'+bwpd+u+';';
    }

    if(sc != 1 && MAG.cfg.css3){

        w = otit.w*sc;
        h = otit.h*sc;
        var trs = 'transform:scale(' + sc + ',' + sc + ')';
        var scss = trs+';-ms-'+trs+';-moz-'+trs+';-webkit-'+trs+';-o-'+trs;
        var mt = ((h-otit.h)/2);
        var ml = ((w-otit.w)/2);
        ts = '<div style="'+scss+';margin:0;margin-left:'+ml+u+';margin-top:'+mt+u+';padding:0;width:'+otit.w+u+';height:'+otit.h+u+';">'+ts+'</div>';
    }


    for(var i=0;i<mg.length;i++){
        mg[i] = (mg[i] ? mg[i] + u : 0);
    }
    // 给标题包上个框框，以保证结果尺寸合适
    var ocfg = {'font-size':MAG.sty.vtit.minFontSize,'line-height':null};
    var css = MAG.sty_getCssStr('title',ocfg)
        +';overflow:hidden;padding:0;margin:'+mg.join(' ')+';text-align:left;height:'+h+u+';'+'width:'+w+u +';'
        + bcss ;

    otit.html = '<div style="'+css+'">'+ts+'</div>';
    otit.w = w;
    otit.h = h;

    return otit;

};

MAG.getBlockHTML = function(oitm,w,h){
    var ts = '';
    if(!oitm)
        return ts;

    var oa = MAG.data[oitm.id];
    if(!oa)
        return ts;

    var pd = MAG.getRelativeFontSize(MAG.sty.listBlockPadding); //边框留白
    var u = MAG.cfg.units;


    var cw = Math.round(w - 2*pd);
    var ch = Math.round(h - 2*pd);

    //期望将标题排为两行，结果根据内容及字数不同可能不同
    var brkNum = (ch/3 <= MAG.sty.title['font-size'] ? 1 : 2);

    //输出标题
    var otit = MAG.formatTitle(oa.title,brkNum,cw,ch);


    /*
     对于图片长宽比与条目块长宽比相近的情况，将整个图片作为区块的背景，并在图上加上标题，形成视觉冲击力较强的画报式排版布局。
     */

    var iw = cw;
    var ih = ch;

    var oimg = MAG.formatAtcImage(oa.image,Math.max(iw,ih));
    var ird = ( oimg && oimg.w && oimg.h ? oimg.w/oimg.h : 0);
    var s,mt,ml;

    var ots = MAG.calCharSize(MAG.sty.text);


    //标题与图片边缘之间的留白
    var tpd = MAG.getRelativeFontSize(MAG.sty.vtit.oitPadding);
    if( oimg && oimg.src != "" && iw > MAG.sty.vtit.minFontSize * MAG.sty.vtit.minLen){
        if( oitm.isMain || Math.abs(iw/ih - ird) < MAG.cfg.ApAsRatio ){  //主图或长宽比适当
            var isc = 1;
            //标题排在图片的下方
            mt = ih - otit.h - tpd*1.5 ;
            //如果标题宽度太大，缩小留白
            ml = (iw-otit.w < tpd ? Math.abs(Math.ceil((iw-otit.w)/2)) : 0);

            if(oitm.isMain){
                iw = w;
                ih = h;
                cw = w;
                ch = h;
                isc = (iw-tpd)/otit.w
                mt = h - otit.h*isc - tpd*2;
                ml = tpd;
            }else{
                otit.w = iw;
            }

            //给标题包上新框框
            otit = MAG.packagedTitle(otit,isc,[mt,0,0,0],true,(ml && ml < tpd ? ml : tpd));

            //构造图片HTML
            s = MAG.getAtcImageHTML(oimg,iw,ih,otit.html);

            return MAG.formatListBlock(s,cw,ch,oitm,oitm.isMain);
        }
    }


    if(MAG.cfg.css3 && (   oitm.isMain ) ){//otit.h > ch || otit.w > cw ||
        var tr;
        if(oitm.isMain)
            tr = Math.round((cw/otit.w)*100)/100;
        else
            tr = Math.round((otit.w > cw ? cw/otit.w : ch/otit.h)*100)/100;

        otit = MAG.packagedTitle(otit,tr,[(oitm.isMain?MAG.sty.text['font-size']:0),0,0,0]);
    }else{

        otit = MAG.packagedTitle(otit);

    }



    //获得剩余空间大小
    var rw = cw;
    var rh = ch - otit.h;

    ts += otit.html;


    //输出时间
    var oifo = MAG.formatBlockInfo([MAG.formatDateTime(oa.pubDate)]);

    //如果剩余空间已经放不下时间，就只显示标题
    if( rh < oifo.h  ){
        return MAG.formatListBlock(ts,cw,ch,oitm);
    }

    ts += oifo.html;

    //获得加上信息块后的剩余空间大小
    rh -= oifo.h;



    var minDescH = MAG.sty.textMinRowBlock * ots.h ;
    var minDescW = MAG.sty.textMinLenBlock * ots.w;



    //如果剩余空间已经放不下图片或描述，就返回带时间的标题
    if( rh < minDescH ){// || rw < minDescW
        return MAG.formatListBlock(ts,cw,ch,oitm);
    }


    var desc = MAG.formatDesc(oa.description);

    //将图片和摘要组合排版
    var atc = [oa.image,{'content':desc,'type':'text'}];
    var cs = MAG.calCharSize(MAG.sty.text);
    var aw = rw;
    //尽量保证描述区域的高度为整倍行高
    var ah = Math.floor(rh/cs.h)*cs.h;

    //希望排两列
    var oatc = MAG.getListDescHTML(atc,aw,ah,2);



    var css = MAG.sty_getCssStr('text',{'color':MAG.sty.listDescColor});
    css += ';width:' + aw + u + ';height:' + ah + u +';';
    css += ';overflow:hidden;padding:0;margin:'+(rh-ah)+u+' 0 0 0;';

    s = '<div style="' + css + ';">'
    s += oatc.html + '</div>';

    ts += s;

    return MAG.formatListBlock(ts,cw,ch,oitm);

};

MAG.getAtcImageHTML = function(oimg,w,h,txtOnImg,css){

    var u = MAG.cfg.units;

    if(!oimg.src){
        //根据目标区域大小，确定用什么尺寸的图片
        oimg = MAG.formatAtcImage(oimg,Math.max(w,h));
    }

    //用css3背景中的cover尺寸来排，IE用户就凑合吧
    var s = '<div style=" '+MAG.sty.cleanDIV + MAG.sty.imageBgCSS.replace('{$imageSrc$}',oimg.src)
        +'width:'+ w + u + ';height:' + h + u + '; '+(css ? css : '')+'">';

    s += (txtOnImg ? txtOnImg : '');
    s += '</div>';

    return s;
};

MAG.formatListBlock = function(content,w,h,oitm,noPadding){
    var u = MAG.cfg.units;
    //各边是否留白
    var tb = (h*1.3 < MAG.cfg.corePart.h);
    var lr = (w*1.3 < MAG.cfg.corePart.w);
    var p = MAG.getRelativeFontSize(MAG.sty.listBlockPadding);

    //var pds = ((tb?p+u:0))+' '+((lr?p+u:0))+' '+((tb?p+u:0))+' '+((lr?p+u:0));

    //给整个条目块包上div，根据noPadding指示实现留白
    var css = 'text-align:left;';
    //    css += 'padding:0;margin:'+p+u+' '+p+u+' 0 0;' ;
        css += 'padding:0;'
        if(!noPadding)
            css += 'margin:'+p+u+';' ;
        else
            css += 'margin:0';
        css += 'width:'+w+u+';height:'+h+u+';overflow:hidden;'

    var s = MAG.sty.listBlockDIV.replace('{$blockCSS$}',MAG.sty.cleanDIV + css  );

    s = s.replace('{$blockHTML$}',content);

    if(typeof(MAG.hooks['constructBlockDIV']) == 'function' ){
        s = MAG.hooks['constructBlockDIV'](s,{link:oitm.id,w:w,h:h,pos:oitm.pos});
    }

    //清理掉替换标记
    s = s.replace(/\{\$attributes\$\}/g,'');

    return s;

};

MAG.formatDesc = function(ds){
    if(!ds)
        return '';

    var regs = [
        ['^[\\s|　]+','','g'],
        ['\\&\\w*$','',''], //类似 &nbs这样的数据垃圾
        ['【.*】','','g'], //没别的，我恨讨厌【 】
        ['^据\\.*报道','',''],
        ['　+','\n','g'], //连续中文空格
        ['[。|……|？|！]+','$&\n','g'] //中文结束标点
    ];

    var reg,r;

    for(var i=0;i<regs.length;i++){
        r = regs[i];
        reg = new RegExp(r[0],r[2]);
        ds = ds.replace(reg,r[1]);
    }


    return ds;
};


MAG.formatBlockInfo = function(a){

    var rs ='';
    var rw = 0;
    var rh = 0;

    var cs = MAG.calCharSize(MAG.sty.note);
    var s = '';
    for(var i=0;i< a.length;i++){
        s += a[i]+' ';
    }

    var css = MAG.sty_getCssStr('note');
    rs = MAG.sty.textLine.replace('{$content$}',s);
    rs = rs.replace('{$textStyle$}',css);


    return {html:rs,w:cs.w * s.length,h:cs.h };
};

MAG.formatDateTime = function(dts){
    dts = Number(dts)*1000;
    var d = new Date(dts);
    var now = new Date();

    var rs;
    var dd = d.getDate();
    var mm = d.getMonth() + 1;
    var mt = d.getMinutes();
    var wk = d.getDay();
    mt = (mt < 10 ? '0'+mt : mt);
    var tm = d.getHours() + ':' + mt;
    var wn = ['日','一','二','三','四','五','六'];

    if(dd == now.getDate() && mm == now.getMonth() + 1 && d.getFullYear() == now.getFullYear())
        rs = '今天 '+ tm;
    else if( now-d < 7*24*60*60*1000 ){
        rs = ( now.getDay() -wk >= 0? '上周' : '周')+wn[wk] + ' '+tm;
    } else
        rs = mm+'月'+dd+'日 '+ tm;

    return (rs.search('NaN') < 0 ? rs : '');
};

/*

传入文章对象，目标区域宽高，返回排版结果

 */

MAG.getListDescHTML = function(atc,w,h,colNum){

    var rv = {'html':'','w':w,'h':h};
    var u = MAG.cfg.units;
    var css3 = MAG.cfg.css3;
    var oa;

    var ap = []; //用于存放各个段落的数组
    var ta;

    //算出每个字的大小
    var sz = MAG.calCharSize(MAG.sty.text);
    //图片文字间距
    var cpd = sz.w;
    //段后距
    var pb = 0;//Math.floor(sz.h*0.5);
    var ml = MAG.sty.minLenPerCol;

    var mainImg = null;

    //先将文章数据重新组合，依据原始段落分配，及\n 标记，拆分成每个段落，并整理图片数据
    for(var i=0;i<atc.length;i++){
        oa = atc[i];
        if(!oa || !oa.type)
            continue;
        if(oa.type == 'text'){
            ta = oa.content.split('\n');
            for(var j=0;j<ta.length;j++){
                ap.push( MAG.formatParagraph(ta[j]) );
            }
        }else if(oa.type == 'image'){
            ta = MAG.collateImageData(oa);
            if(ta){
                //找出适合做主图的图片
                if( !mainImg && ( w - h * ta.whRD > ml*sz.w/2 || h - w/ta.whRD > 0  || cw < ml*sz.w ) ){ //sz.h* MAG.sty.minRowPerCol
                    mainImg = ta;
                } else{
                    ap.push(ta);
                }
            }
        }
    }
    var cs = '';
    var iw,ih,pos;
    var cw = w;
    var ch = h;
    var uw = 0;
    var uh = 0;
    var minh = (sz.h* (MAG.sty.minRowPerCol+1));

    if(mainImg){

        pos = (Math.random()>0.5); //随机放在左右
        if( ch - cw/mainImg.whRD > 0 || cw < ml*sz.w ){
            // 如果宽度适合，或者排主图后余下行数小于最小行数
            iw = cw;
            ih = cw/mainImg.whRD;
            if(ch-ih < minh)
                ih = ch;
            cs += MAG.getAtcImageHTML(mainImg,iw,ih,'',(ih == ch ? '' : ';margin:0;margin-bottom:'+cpd+u+';') );
            uh = ih + cpd;
        }else if( cw - ch * mainImg.whRD -cpd > ml*sz.w/2 || cw < ml*sz.w ){
            // 如果高度适合（图片高为区域高时，剩下的宽度够放文字）
            ih = ch;
            iw = Math.floor(ch*mainImg.whRD);
            if(iw < cw/colNum/1.5)
                iw = cw/colNum-cpd*(colNum-1);
            cs += MAG.getAtcImageHTML(mainImg,iw,ih,'',';float:'+(pos ? 'right;margin-left:'+cpd+u+';' : 'left;margin-right:'+cpd+u+';') );
            uw = iw + cpd*2;
        }
    }

    cw -= uw;
    ch -= uh;

    //修正不符合要求的分栏数
    //太大的
    if( cw/colNum > MAG.sty.maxLenPerCol*sz.w +cpd ){
        colNum = Math.floor(cw / (MAG.sty.maxLenPerCol*sz.w + cpd));
    }
    //太小的
    if( cw/colNum < ml*sz.w +cpd ){
        colNum = Math.round(cw / (ml*sz.w + cpd));
    }

    colNum = (colNum < 1 ? 1 :colNum);


    // 如果已经有主图，行太少就别填了
    if( !(ch < minh  && uh > 0) ){

        var cow = (cw - cpd * (colNum-1))/colNum;
        var coh = ch;

        var ccw = cow+u;
        var ccc = colNum;
        var ccg = cpd+u;
        var cc = ';-moz-column-count:'+ccc+';-webkit-column-count:'+ccc+';column-count:'+ccc+';-moz-column-width:'+ccw+';-webkit-column-width:'+ccw+';column-width:'+ccw+';';
        var cg = ';-moz-column-gap:'+ccg+';-webkit-column-gap:'+ccg+';column-gap:'+ccg+';';

        if(!css3 || colNum < 2){
            cc = '';
            cg = '';
        }

        //尽量使用行高的倍数，减少半行几率
        var nch = Math.floor(ch/sz.h)*sz.h;
        var ncpd;

        cs += '<div style="text-align:justify;display:block;margin:0;padding:0;overflow:hidden;';
        cs += 'width:'+cw+u+';height:'+nch+u+';';
        if(!css3){
            cs += 'font-size:'+sz.fs+u+';line-height:'+sz.h+u+';';
        }else{
            cs += cc+cg;
        }
        cs += ';">';


        for(var i=0;i<ap.length;i++){
            oa = ap[i];
            //给段落加上p
            if(typeof(oa)=='string'){
                cs += '<p style="padding:0;margin:0 0 '+(pb >0 ? pb+u : '0')+' 0;overflow-y:hidden;font-size:'+sz.fs+u+';line-height:'+sz.h+u+';">';
                cs += oa;
                cs += "</p>";
            }else if(typeof(oa)=='object' && oa.type=='image'){
                iw = cow ;
                ih = iw / oa.whRD;
                if(ih > coh || coh - ih < minh  ){
                    //只有一栏，剩余的高度太少，宽度太少，图片比例不合适，就放弃这图片
                    if(colNum == 1 && coh - ih < minh && cow<sz.w*ml  && Math.abs(iw/ih - oa.whRD) > MAG.cfg.ApAsRatio  )
                        continue;
                    ih = coh;
                    cs += MAG.getAtcImageHTML(oa,iw,ih);
                }else{
                    //调整图片后的距离，避免出现半行
                    ncpd = (coh-ih)%sz.h;
                    cs += MAG.getAtcImageHTML(oa,iw,ih,'',';margin:0 '+(cow-iw)/2+u+' '+ncpd+u+' 0;'+(css3?'':'float:left;margin-right:'+cpd+u+';') );
                }
            }
        }


        cs +='</div>';
    }




    var rs = '<div style="display:block;overflow:hidden;'
        +';width:'+ w + u + ';height:'+ h + u
        + ';padding:0;margin:0;">';
    rs += cs;
    rs += '</div>';

    rv.html = rs;

    return rv;

};



/*
MAG.getPostLayoutHTML = function(atc,w,h,colNum){

    var rv = {'html':'','w':w,'h':h};
    var u = MAG.cfg.units;
    var oa;

    var ap = []; //用于存放各个段落的数组
    var ta;

    //算出每个字的大小
    var sz = MAG.calCharSize(MAG.sty.text);
    //列间距
    var cpd = sz.w;
    //段后距
    var pb = Math.floor(sz.fs*0.5);
    var ml = MAG.sty.minLenPerCol;

    //修正不符合要求的分栏数
    //太大的
    if( w/colNum > MAG.sty.maxLenPerCol*sz.w +cpd ){
        colNum = Math.floor(w / (MAG.sty.maxLenPerCol*sz.w + cpd));
    }
    //太小的
    if( w/colNum < ml*sz.w +cpd ){
        colNum = Math.ceil(w / (ml*sz.w + cpd));
    }

    colNum = (colNum < 1 ? 1 :colNum);
    var pcnt = 0;
    var icnt = 0;
    //先将文章数据重新组合，依据原始段落分配，及\n 标记，拆分成每个段落，并整理图片数据
    for(var i=0;i<atc.length;i++){
        oa = atc[i];
        if(!oa || !oa.type)
            continue;
        if(oa.type == 'text'){
            ta = oa.content.split('\n');
            for(var j=0;j<ta.length;j++){
                ap.push( MAG.formatParagraph(ta[j]) );
                pcnt ++;
            }
        }else if(oa.type == 'image'){
            ta = MAG.collateImageData(oa);
            if(ta){
                ap.push(ta);
                icnt ++;
            }
        }
    }

    //存放每栏的数组
    var cols = new Array(colNum);
    var oc;
    var cw = Math.floor((w-cpd*(colNum-1))/colNum);
    var ch = h;
    var rs = '';
    var ln,rh;
    //当前排到第几段
    var cl = 0;
    var ocl,cn,iw,ih,ncw,nch,ncn,cs,rr,bst;
    //排过某段后，暂时没排下的图片和段落
    var ui = [];

    //初始化列数据
    for(var i=0;i<cols.length;i++){
        cols[i] = {w:cw,h:ch,html:''};
    }
    //记录当前用掉多宽，用于动态调整栏宽
    var uw = 0;
    var isFstP = true;
    for(var idx=0;idx<cols.length;idx++){
        oc = cols[idx];
        cw = oc.w;
        ch = oc.h;
        //本栏剩余行数
        rh = ch;
        //本栏中每行可排的字数
        cn = Math.floor(cw/sz.w);
        //存储当前列排版内容
        cs = '';
        while(rh > 0 && cl <ap.length){
            //当前排到的段落对象
            ocl = ap[cl];
            if(typeof(ocl)=='string'){
                //余下空间能排几行
                rr = Math.floor((rh-pb)/sz.h)*Math.floor(cw/sz.w);
                //如果排不下，并且没排过文字，而后面又没有列了
                if(rr < ocl.length && idx < cols.length-1 && (rh < ch ) ){
                    rh = 0;
                    cl --;
                }else{
                    //本段需要排几行
                    ln = ocl.length / cn;
                    cs += '<p style="padding:0;margin:0 0 '+pb+u+' 0;font-size:'+sz.fs+u+';">';
                    cs += ocl;
                    cs += "</p>";
                    rh -= (ln*sz.h + pb);
                    pcnt --;
                    isFstP = true;
                }
            }else{
                if(ocl.type == 'image'){
                    //如果宽高比适合（图片为整列高时，余下空间够放文字），且本栏中尚未排过内容，且后续还有栏
                    if( rh == ch && cols.length-idx > 0 &&   w-uw-ch*ocl.whRD > ml*sz.w ){
                        ih = ch;
                        iw = ch*ocl.whRD;

                        //将列宽设置为图片宽
                        cw = iw;
                        //算出余下还要排几列
                        ncn = cols.length -1 - idx;
                        //算出余下每列宽度
                        if(ncn > 0){
                            ncw =  Math.floor( (w- uw -cw)/ncn - ncn*cpd );
                            for(var i=idx;i<cols.length;i++ ){
                                cols[i].w = ( i == idx ? cw : ncw);
                            }
                        }

                        cs += MAG.getAtcImageHTML(ocl,cw,ih);
                        rh -= (ih+pb);
                        //如果宽高比适合（图片为余下宽时，余下空间够放文字），且本栏中尚未排过内容，且后续还有栏
                    }else if( rh == ch && cols.length-idx > 0 && rh - (w-uw-cpd)/ocl.whRD - pb*2 > sz.h* MAG.sty.minRowPerCol  ){
                        iw = (w-uw-(idx==0?0:cpd) );
                        ih = iw/ocl.whRD;
                        cw = iw;
                        ch = ih+cpd;
                        //将列高设置为图片高
                        ch = ih + pb*2;
                        //算出余下每列高度
                        nch =  Math.floor( rh - pb - ch );
                        for(var i=idx;i<cols.length;i++ ){
                            cols[i].h = nch;
                        }

                        cs += MAG.getAtcImageHTML(ocl,iw,ih);

                        //跳过此列
                        idx --;
                        rh = 0;

                    }else{
                        iw = cw;
                        ih = cw / ocl.whRD;
                        //图片太高就缩小高度
                        ih = (ih > ch ? ch :ih);
                        ch = (ih + pb);
                        cs += MAG.getAtcImageHTML(ocl,iw,ih,'',';margin-bottom:'+pb+u+';');
                        rh -= ch;
                    }

                    icnt --;
                }
            }
            cl ++;
        }
        rs += '<div style="float:left;display:block;text-align: justify;width:'+ cw + u + ';height:'+ ch + u
            + ';padding:0;margin:0;'+(idx<=0 ? '' : 'margin-left:'+cpd+u)+';">';
        rs += cs;
        rs += '</div>';

        uw += ( cw + (idx<=0 ? 0 :cpd ) );
    }


    rv.html = rs;

    return rv;

};
*/

MAG.formatParagraph = function(ps){

    //这里暂时采用添加中文空格制造首行缩进。原因是便于计算，也为日后添加英文排版提供方便
    return ('　　'+ps);

};

//将原始的图片数据整理规整，减少日后判断处理的麻烦
MAG.collateImageData = function(oImg){

    if(!oImg)
        return null;

    var rd = MAG.cfg.PtPxRatio;

    var rv = {
        content:(oImg.fastlink && oImg.fastlink.match(/^http/) ? oImg.fastlink: null),
        fastlink:( oImg.content && oImg.content.match(/^http/) ? oImg.content : null),
        width:(oImg.width ? Number(oImg.width) : 0),
        height:(oImg.height ? Number(oImg.height) :0 ),
        type:oImg.type};

    //得出出片宽长比，如果不知道图片尺寸，则给出个默认值
    rv.whRD = (rv.height && rv.width ? rv.width / rv.height : 5/4 );

    return rv;

};

/*

依据sty中的参数配置，返回每个字占用的长宽等信息

w：包含字间距在内的字符宽度
h：该字符的高度（行高）
hp：行高相对字号的比值
fs：实际字号
u：尺寸单位

 */

MAG.calCharSize = function(os){

    var rv = {};
    var lhs = os['line-height'];
    rv.fs = os['font-size'];

    if(typeof(lhs) == 'number'){
        rv.hp = lhs/rv.fs;
        rv.h = lhs;
    }else{
        rv.hp = Number( lhs.replace('%','') )/100;
        rv.h = Math.ceil(rv.fs*rv.hp);
    }

    rv.ls = os['letter-spacing'];
    rv.w = rv.fs + rv.ls;
    rv.u = MAG.cfg.units;
    return rv;

};

/*

预测某个区块可以排多少文字

w：区块宽度
h：区块高度
ocs：字符尺寸对象

返回

rv ={
n：预计总共可以排多少字
ln：每行字数
rn：行数
}

*/

MAG.preCalBlockCharNum = function(w,h,ocs){

    var rv = {
        ln:Math.floor(w/ocs.w),
        rn:Math.floor(h/ocs.h),
        n:0};

    rv.n = rv.ln * rv.rn;

    return rv;
};


/*
格式化标题文字

*/

MAG.formatTitle = function(ts,brkNum,w,h){

    var cs = MAG.calCharSize(MAG.sty.title);
    var fs = cs.fs;
    var ls = cs.ls;
    var u = cs.u;
    //以行高相对字号的比值
    var lhp = cs.hp;
    var lh = cs.h;

    var rs = '';
    var css;

    //记录最终的行高
    var rh = 0;
    var rw = 0;
    var tw;

    var opc = MAG.preCalBlockCharNum(w,h,cs);
    //每行的字数
    var cn = opc.ln;

    var mcs = MAG.calCharSize({'line-height':MAG.sty.title['line-height'],'font-size':MAG.sty.vtit.minFontSize,'letter-spacing':0});
    var ompc = MAG.preCalBlockCharNum(w,h,mcs);

    //每行最大字数
    var mcn = ompc.ln;

    //如果字数太多，或设定的单行字数太少，采用浏览器自动断行，并给出估计尺寸
    if(ts.length/brkNum > opc.n || mcn < MAG.sty.vtit.minLen){
        //估算出大概回排多高
        ts = ts.replace(/\s+/g,' ');
        rh = Math.ceil(ts.length/mcn) * mcs.h;
        rw = w;
        //用最小字号去排，设定自动换行，两端对齐
        css = MAG.sty_getCssStr('title',{'font-size':MAG.sty.vtit.minFontSize,'line-height':'1.2em'})//mcs.h+u
            + ';white-space:normal;text-align:justify; padding:0;margin:0;width:'+rw+u +';' ;
        rs = MAG.sty.textLine.replace('{$content$}',ts);
        rs = rs.replace('{$textStyle$}',css);

        return {html:rs,w:rw,h:rh};
    }



    var br = '<br>';
    var nfs, p, nls,nlh;

    var a = MAG.breakText(ts,brkNum,mcn-1);
    var rn = a.length;

    var mfs = MAG.sty.vtit.minFontSize;

    //如果整个区域太拥挤，缩小整个字号(css3将用浏览器缩放搞定)
    if(!MAG.cfg.css3 && rn * lh > (h*2/3) ){
        p = (h*2/3) /(rn * lh);
        fs = Math.floor(fs*p);
        //避免出现太小的字体
        if( fs < mfs )
            fs = mfs - (mfs-fs > 1 ? 1 : 0);
        cn = Math.floor(w/(fs+ls));
        lh = Math.ceil(fs*lhp);
        nlh = lh;
    }


    for(var i=0;i< a.length;i++){
        //如果一行不能全部显示，或者被排成两行情况下，制造大小行效果
        if(a[i].length >= cn*.9 || (a.length==2 && i==0) ){
            p = ((a.length==2 && i==0) ? 0.7 : (cn *.9/(a[i].length )));
            //缩小字号
            nfs = Math.floor(fs * p);
            if(nfs >= fs )
                nfs = fs -1;
            //避免出现太小的字体
            if( nfs < mfs )
                nfs = mfs - (mfs-nfs > 1 ? 1 : 0);
            nls = ls;
            nlh = Math.ceil(nfs*lhp);
        }else{
            nfs = fs;
            nls = ls;
            nlh = lh;
        }
        //设置上字体大小
        rs += '<p style="padding:0;margin:0;white-space:nowrap;letter-spacing:'+nls + u
            +';font-size:' + nfs + u
            +';line-height:'+nlh+u
            +';">' +a[i]+'</p>';

        tw = a[i].length * (nfs + nls);
        rw = (tw > rw ? tw :rw);
        rh += nlh;
    }

    //给宽度留半个字的尾巴，以容忍误差
    rw += Math.round(MAG.sty.textMinFontSize/2);

    var rv = {inner:rs};


    rv.html = rs;
    rv.w = rw;
    rv.h = rh;

    return rv;

};

/*
拆分文本

ts  标题文本
brk 期望的行数

返回以 \n 标示换行的字符串

 */

MAG.breakText = function(ts,brk,ln){

    if(!ts)
        return [''];

    if(!brk) brk = 1;

    //去掉换行符
    ts = ts.replace(/[\n|\r]/g,'');

    //合并多个空白
    ts = ts.replace(/[\s+]/g,' ');

    //去掉垃圾字符
    ts = ts.replace(/\&\w+;/,'');

    var reg2 = new RegExp(MAG.sty.newline2);

    //如果文字中没有空格，给中英文之间加个 \r 标记
    var sp = ts.search(reg2);
    if( sp < 0 || sp > ts.length/2 ){
        ts = ts.replace(/([^x00-xff])([\w|\d])/g,'$1\r$2');
    }

    //如果按期望的换行数无法满足，修改期望换行数
    if( brk*ln < ts.length){
      brk = Math.round(ts.length /ln);
    }

    if(brk == 1){
        return [ts];
    }

    // 查找标点符号的正则
    var reg = new RegExp(MAG.sty.newline,'g');

    //在所有标点符号后加一个换行符
    ts = ts.replace(reg,'$&\n').replace(/\n$/,'');

    //按标点拆分为数组
    var a = ts.split("\n");

    var rs = [];
    //如果够了
/*
    if(a.length >= brk){
        for(var i=0;i<brk-1;i++){
            rs.push(a.shift());
        }
        rs.push(a.join(''));
        return rs;
    }
*/
    var s,idx,nn;
    var cnt = brk - a.length;

    var nbs = '';
    for(var i=0;i< a.length;i++){

        s = a[i];
        idx = s.search(/\s/);
        if(idx <=0)
            idx = s.search(reg2);
        if( cnt < 0 || (s.length < ln && idx <=0 && cnt > 0) ){
            rs.push(s.replace(/\r/g,''));
            continue;
        }
        while( (idx >= 0 || s.length > ln) && cnt > 0 ){
            if(idx <= 3 || idx > ln || ln < 6){//没有空格，或空格太靠前后，或每行字数太少，就直接断了
                //如果可能，从三分一处断开，这样好看些
                idx = ( ln > 10 && s.length*2/3 < ln ? Math.ceil(s.length/3) : ln );
                nbs = s.substring(idx-1,idx+2);
                if(nbs.match(/\d\.\d/)){
                    idx += 2;
                }
            }
            rs.push(s.substring(0,idx).replace(/\r/g,''));
            s = s.substring(idx);
            s = s.replace(/^\r/,'');
            idx = s.search(/\s/);
            if(idx <=0)
                idx = s.search(reg2);
            cnt --;
        }
        rs.push(s.replace(/\r/g,''));

    }
    return rs;

};


/*
    从列表数据中获得图片地址
    oImg : 列表中的图片数据对象
    maxW : 目标区域最大尺寸，可忽略

    返回：图片地址，如果出错返回空字符串
*/
MAG.formatAtcImage = function(oImg,maxW){

    var rv = oImg;

    if(!oImg)
        return null;

    //根据目标区域大小选择合适的图片尺寸
    var sz = 's';
    var rd = MAG.cfg.PtPxRatio.x;
    if(maxW){
        sz = maxW < 80*rd ? 't' : ( maxW < 160*rd ? 's' : ( maxW < 320*rd ? 'm' : 'l') )
    }

    if(oImg.fastlink && oImg.fastlink.match(/^http/)){
        rv.src = oImg.fastlink.replace(/\.[t|s|m|l]\./,'.'+sz+'.');
    }else if(oImg.content && oImg.content.match(/^http/)){
        //没有加速图片就用原图
        rv.src = oImg.content;
    }

    rv.w = (oImg.width ? Number(oImg.width) * rd : 0) ;
    rv.h = (oImg.height ? Number(oImg.height) * rd :0 );
    rv.org = oImg.content;

    return rv;
};

/*
    根据列表条目信息，计算条目权重得分
    oItm : 列表中的条目对象

    返回：条目重要性得分，最低零分，最高不限
*/
MAG.getListItemScore = function(oItm){

    var sc = 0; //得分
    if(!oItm)
        return sc;

    var oImg = oItm.image;

    //如果有图片对象，进行相应加减分
    if(oImg){
        sc += 10;
        if(oImg.fastlink && oImg.fastlink.match(/^http/)){
            //如果有加速链接
            sc += 10;
        }
        if(oImg.content && oImg.content.match(/^http/)){
            //如果有加原图地址
            sc += 10;
        }
        if(oImg.width){
            //有原图宽度数据
            sc += 10;
            if(oImg.width >= 500){
                //原图是大图
                sc += 10;
            }
            if(oImg.width < 100){
                //原图是小图，扣分
                sc -= 10;
            }

        }
        if(oImg.height){
            //有原图高度数据
            sc += 10;
            if(oImg.height >= 500){
                //原图是大图
                sc += 10;
            }
            if(oImg.height < 100){
                //原图是小图，扣分
                sc -= 10;
            }
        }
    }

    var odes = oItm.description;

    //如果有摘要信息，进行相应加减分
    if(odes){
        sc += 10;
        // 描述较长加分
        if(odes.length >= 100)
            sc += 10;
        // 描述太短减分
        if(odes.length < 20)
            sc -= 10;
    }

    //最低分为零分
    if(sc <0)
        sc = 0;
    return sc;
};

MAG.getPtPxRatio = function(u){

    if(!u)
        u = 'pt';

    if(MAG.cfg.PtPxRatio && MAG.cfg.units == u)
        return MAG.cfg.PtPxRatio;

    // 创建一个测试用的div

    var tdiv = document.createElement("div");
    tdiv.style.height = "100"+u;
    tdiv.style.width = "100"+u;
    tdiv.style.visibility = "hidden";
    document.body.appendChild(tdiv);

    // 获得该div的像素尺寸
    var xres = tdiv.offsetWidth;
    var yres = tdiv.offsetHeight;

    // 移除测试用的div
    tdiv.parentNode.removeChild(tdiv);

    // 返回pt换算成px的比率
    return {"x":100/xres,"y":100/yres};

};

/*
装载队列
 */

MAG.lq = {
    'maxParallel':3,    //最大并行请求数
    'maxLoadTime':30*1000,  //最大装载时间（当并发请求达到最大值后，会优先清除这些超时的请求）
    'delay':500,    //每次请求的间隔(非并发时)
    'id':1,
    'iv' : null,
    'curr':{'len':0,'sc':{}},
    'queue':[],
    'qdata':{}
};

/*

直接装载服务器上的数据，
如果有odat参数，将不进行装载，直接用这个数据

可以随时随意调用此方法，有队列去管理装载过程

sUrl        :   要装载的数据地址，除非指定 noproxy， 否则会自动加上代理服务器地址，

odat        :   可以将数据直接从这里传入，而非通过服务器再装载（通常用于将已有的本地数据装入）

noproxy     :   如果要装载的链接是个Fastlink，需要指定noproxy，这样将不通过代理加载

bPriority   :   如果希望本次加载排在队列前面，指定为 true

 */

MAG.loadData = function(sUrl,noproxy,bPriority){


    if(!sUrl || !sUrl.match(/^http/)){
        return false;
    }

    //加载顺序号
    MAG.lq.id ++ ;

    var id = MAG.lq.id;

    //优先加载就放在数组前面，否则放后面
    if(bPriority){
        MAG.lq.queue.unshift(id);
    } else {
        MAG.lq.queue.push(id);
    }

    //记录下加载的参数
    MAG.lq.qdata[id] = {'sUrl':sUrl,'noproxy':noproxy};

    //启动加载队列
    MAG.execQueue();

};

/*

手动或定时去执行队列

 */

MAG.execQueue = function(){

    //如果已经有一个定时任务，杀掉它
    if(MAG.lq.iv){
        window.clearTimeout(MAG.lq.iv);
        MAG.lq.iv = null;
    }

    //队列中没有东西，放弃
    if(MAG.lq.queue.length < 1){
        return;
    }

    var osc;
    var now = (new Date()).valueOf();
    //如果达到了最大并发数
    //todo:如果是在 MAG.gotData 里面调用的（如 onDataLoad hook里面 ），会占用一个并发数
    if( MAG.lq.curr.len >= MAG.lq.maxParallel ){
        //找出正在进行中，已经超时的调用，结束它
        for(var d in MAG.lq.curr.sc ){
            osc = MAG.lq.curr.sc[d];
            if( (now - osc.start) > MAG.lq.maxLoadTime ){
                MAG.finishLoad(d);
                break;
            }
        }
        //如果没可结束的，过一会再来
        if(MAG.lq.curr.len >= MAG.lq.maxParallel){
            MAG.lq.iv = window.setTimeout(MAG.execQueue,MAG.lq.delay);
            return;
        }
    }

    //取出队列中第一个
    var id = MAG.lq.queue.shift();

    var oq = MAG.lq.qdata[id];
    var sUrl = oq.sUrl

    MAG.lq.curr.sc[id] = {'start':now,'sUrl':sUrl};
    MAG.lq.curr.len ++;

    //加上代理服务器
    var px = (oq.noproxy ? '' : MAG.cfg.proxyUrl);


    if(px.match(/^http/))
        sUrl =  px + '?url='+encodeURI(sUrl)+'&';
    else
        sUrl = sUrl  + (sUrl.search(/\?/) < 0 ? '?' : '&');

    sUrl += 'var=_MAG_buffer_'+id+'&cb=MAG.gotData&cbp='+id+'&t='+now;


    var ojs = document.createElement('script');
    ojs.id = 'MAGjson_'+id;
    ojs.charset = 'utf-8';
    ojs.src = sUrl;

    document.body.appendChild(ojs);

    //过一会再来看看是否有要执行的
    MAG.lq.iv = window.setTimeout(MAG.execQueue,MAG.lq.delay);

    justtest = id;

};

/*

服务器返回调用

 */

MAG.gotData = function(odat,id){

    if(!id)
        id = justtest;

    var oq = MAG.lq.curr.sc[id];

    var rv = MAG.appendData(oq.sUrl,odat);

    if(typeof(MAG.hooks['onDataLoad']) == 'function'){
        var runs = "MAG.hooks['onDataLoad'](_MAG_buffer_"+id+",'"+rv.sUrl+"','"+oq.sUrl+"');";
        window.setTimeout(runs,10);
    }

    MAG.finishLoad(id);

};

/*

打扫战场

 */

MAG.finishLoad = function(id){


    delete MAG.lq.curr.sc[id];
    MAG.lq.curr.len --;

    delete  MAG.lq.qdata[id];

    var ojs = document.getElementById('MAGjson_'+id);
    if(ojs){
        document.body.removeChild(ojs);
    }


};


MAG.loadNextData = function(sUrl){

    var olnk = MAG.links[sUrl];
    if(!olnk || typeof(olnk.next) != 'string' || !olnk.next.match(/^http/) )
        return false;


    return MAG.loadData(olnk.next,true);

};

MAG.emptyData = function(sUrl){

    if( !MAG.links[sUrl])
        return false;

    MAG.links[sUrl] = {'pages':[]};

    return true;

};

