var $ = jQuery = parent.jQuery;
//author:yaya,jihu
//uloveit.com.cn/template
//how to use?  YayaTemplate("xxx").render({});
var YayaTemplate = YayaTemplate ||
    function(str) {
        //核心分析方法
        var _analyze = function(text) {
            return text.replace(/{\$(\s|\S)*?\$}/g, function(s) {
                return s.replace(/("|\\)/g, "\\$1").replace("{$", '_s.push("').replace("$}", '");').replace(/{\%([\s\S]*?)\%}/g, '",$1,"')
            }).replace(/\r|\n/g, "");
        };
        //中间代码
        var _temp = _analyze(document.getElementById(str) ? document.getElementById(str).innerHTML : str);
        //返回生成器render方法
        return {
            render : function(mapping) {
                var _a = [], _v = [], i;
                for(i in mapping) {
                    _a.push(i);
                    _v.push(mapping[i]);
                }
                return (new Function(_a, "var _s=[];" + _temp + " return _s;")).apply(null, _v).join("");
            }
        }
    };

//myTemplate
var myTemplate = function(templid, container, templateCallback) {
    var _tpl = {};
    var tmplname = $('#'+templid,document).attr('name');
    var tmpl;
    if(tmplname){
        var pes = parent.es;
        if(pes && pes['_tmpl_'] && pes['_tmpl_'][tmplname]){
            tmpl = pes['_tmpl_'][tmplname];
        }
        else{
            tmpl = YayaTemplate(templid);
            if(pes){
                if(!pes['_tmpl_'])
                    pes['_tmpl_'] = {};

                //pes['_tmpl_'][tmplname] = tmpl;  //safari内核浏览器出问题，包括ios设备和pc设备
            }
            //console.log('naifen >> 缓存中无此类模板，直接生成');
        }
    }else{
        tmpl = YayaTemplate(templid);
        //console.log('naifen >> 缓存中无此类模板，直接生成，模板没有给名字');
    }
    var $container = $('#' + container, document);
    //var $container_imgs = $container.find('img');
    var imgsNum = 0;

    var threshold = parent.es && parent.es.cardHeight || 400;
    //corner-stamp
    if($container.is('.corner-stamp')) {
        // Masonry corner stamp modifications
        $.Mason.prototype.resize = function() {
            setTimeout(function(that){
                return function(){
                    that._getColumns();
                    that._reLayout();
                }
            }(this),100)
            //this._getColumns();
            //this._reLayout();
        };

        $.Mason.prototype._reLayout = function(callback) {
            var freeCols = this.cols;
            if(this.options.cornerStampSelector) {
                var $cornerStamp = this.element.find(this.options.cornerStampSelector), cornerStampX = $cornerStamp.offset().left - (this.element.offset().left + this.offset.x + parseInt($cornerStamp.css('marginLeft')) );
                freeCols = Math.floor(cornerStampX / this.columnWidth);
            }
            // reset columns
            var i = this.cols;
            this.colYs = [];
            while(i--) {
                this.colYs.push(this.offset.y);
            }

            for( i = freeCols; i < this.cols; i++) {
                this.colYs[i] = this.offset.y + $cornerStamp.outerHeight(true);
            }

            // apply layout logic to all bricks
            this.layout(this.$bricks, callback);
        };
    } else {
        // $.Mason.prototype.resize = function() {
        // var prevColCount = this.cols;
        // // get updated colCount
        // this._getColumns();
        // if(this.cols !== prevColCount) {
        // // if column count has changed, trigger new layout
        // this._reLayout();
        // }
        // };
        // $.Mason.prototype._reLayout = function(callback) {
        // // reset columns
        // var i = this.cols;
        // this.colYs = [];
        // while(i--) {
        // this.colYs.push(this.offset.y);
        // }
        // // apply layout logic to all bricks
        // this.layout(this.$bricks, callback);
        // };
    }

    //init
    _tpl.init = function(data, callback, resizeCallback) {
        if(!data){
            //$container.html('');
            $container.empty();
            return;
        }
        if(!!data.type && data.type != tmplname){
            return;
        }
        data._tempType_ = 'init';
        var str = (tmpl.render(data));
        $container.html(str);
        //
        //$container.imagesLoaded(function() {
        //masonry
        if($container.is('.masonry')) {
            //$container.masonry();
            $container.masonry({
                itemSelector : '.box',
                isResizable : true,
                customWindow : window,
                cornerStampSelector : '.stamp'
            }).masonry('reload');
        }

        //lazyload init
        var _imgs = $container.find("img")
            .filter(function(){return $(this).parent().data('role')=='image'});
        imgsNum = _imgs.length;
        if(_imgs.length > 0) {
            if(!parent.es.bDefaultShowPic){
                _imgs.on('load',function(){imgRetry(this)});
            }else{
                _imgs.lazyload({
                    container : window, //因为$为父窗口的，所以必须制定当前容器
                    skip_invisible : false,
                    //effect : "fadeIn",
                    threshold : threshold,
                    load: function(imgObj){
                        imgGoldenSection(this,imgObj,resizeCallback); //this 为 <img> , imgObj 为图片对象
                    },
                    error: function(imgObj){
                        imgRetry(this); //this 为 <img> , imgObj 为图片对象
                    }
                });
            }
        }

        //callback
        if( typeof templateCallback === 'function')
            templateCallback(data);
        if( typeof callback === 'function') callback();

        //})
    };

    //append
    _tpl.append = function(data, callback, resizeCallback) {
        if(!data)
            data = {};
        data._tempType_ = 'append';
        var $str = $(tmpl.render(data));
        $container.append($str);
        //$container.imagesLoaded(function() {
        //masonry
        if($container.is('.masonry')) {
            $container.masonry('appended', $str, false);
        }

        //lazyload init
        var _imgs = $container.find("img")
            .filter(function(){return $(this).parent().data('role')=='image'})
            .slice(imgsNum);
        imgsNum += _imgs.length;
        if(_imgs.length > 0) {
            if(!parent.es.bDefaultShowPic){
                _imgs.on('load',function(){imgRetry(this)});
            }else{
                _imgs.lazyload({
                    container : window, //因为$为父窗口的，所以必须制定当前容器
                    skip_invisible : false,
                    //effect : "fadeIn",
                    threshold : threshold,
                    load: function(imgObj){
                        imgGoldenSection(this,imgObj,resizeCallback);
                    },
                    error: function(imgObj){
                        imgRetry(this);
                    }
                })
            };
        }

        //callback
        if( typeof templateCallback === 'function')
            templateCallback(data);
        if( typeof callback === 'function') callback();

        //})
    };
    //trigger
    var st;
    _tpl.trigger = function(type, whlt) {
        window.clearTimeout(st);
        if(type == 'scroll') {
            var _imgs = $container.find("img")
                .filter(function(){return $(this).parent().data('role')=='image'});
            if(_imgs.length > 0) {
                st = setTimeout(function() {
                    $(window).trigger('scroll');
                }, 0);

                //showhidden
                var __imgs = _imgs.filter(function(){
                    var $photoFrame=$(this).parent();
                    return $photoFrame.attr('ishidden');
                });
                if(__imgs.length > 0){
                    __imgs.each(function() {
                        var $photoFrame=$(this).parent();
                        $photoFrame.removeAttr('ishidden');
                        $(this).show().prev().hide();
                    })
                }
            }
        } else if(type == 'hideall') {
            //hideshown
            var _imgs = $container.find("img")
                .filter(function(){
                    var $photoFrame=$(this).parent();
                    return $photoFrame.data('role')=='image' && $photoFrame.attr('status')==1;
                });
            if(_imgs.length > 0) {
                _imgs.each(function() {
                    var $photoFrame=$(this).parent();
                    $photoFrame.attr('ishidden',true);
                    $(this).hide().prev().show();
                })
            }
        }
    };
    return _tpl;
};
//format
/**
 * 格式化文章title
 */
var formatTitle = function(str) {
    var s = str.replace(/(^\s*)|(\s*$)/g, '')//trim
        .replace(/([,.，。]+$)/g, '')//去掉结尾的标点
        .replace(/(\s+)|[,，。]/g, '\n')//空格标点->换行
        .replace(/[:：]/g, '：\n')//冒号->\n
        .replace(/(\s+)/g, '\n')//合并多个换行
        .replace(/\n/g, '<br>')
    return s;
}
/**
 * 格式化Feed中的时间格式(当前时间,Feed时间)
 */
var formatFeedTime = (function() {
    var MTEXT = "月";
    var DTEXT = "日";
    var TODAYTEXT = "今天";
    var BSTEXT = "秒前";
    var BMTEXT = "分钟前";

    return function(dServerTime, dFeedTime) {
        if(dServerTime == 'Invalid Date' || dFeedTime == 'Invalid Date') return '';
        var server_year = dServerTime.getFullYear();
        var feed_year = dFeedTime.getFullYear();

        var server_month = dServerTime.getMonth() + 1;
        var feed_month = dFeedTime.getMonth() + 1;

        var server_day = dServerTime.getDate();
        var feed_day = dFeedTime.getDate();

        var server_hour = dServerTime.getHours();
        var feed_hour = dFeedTime.getHours();
        if(feed_hour < 10)
            feed_hour = "0" + feed_hour;
        var feed_minute = dFeedTime.getMinutes();
        if(feed_minute < 10)
            feed_minute = "0" + feed_minute;

        var diff_time = dServerTime - dFeedTime;
        diff_time = diff_time > 0 ? diff_time : 0;
        diff_time = diff_time / 1000;

        if(server_year != feed_year) {
            return feed_year + '-' + feed_month + '-' + feed_day + ' ' + feed_hour + ':' + feed_minute;
        } else if(server_month != feed_month || server_day != feed_day) {
            return feed_month + MTEXT + feed_day + DTEXT + feed_hour + ':' + feed_minute;
        } else if(server_hour != feed_hour && diff_time > (60 * 60)) {
            return TODAYTEXT + feed_hour + ':' + feed_minute;
        } else if(diff_time < 51) {
            diff_time = diff_time < 1 ? 1 : diff_time;
            return (Math.floor((diff_time - 1) / 10) + 1) + "0" + BSTEXT;
        } else {
            return Math.floor((diff_time / 60) + 1) + BMTEXT;
        }
        return '';
    };
})();

/**
 * 时间对象的格式化;
 */
Date.prototype.format = function(format) {
    if(this == 'Invalid Date') return '';
    /*
     * eg:format="YYYY-MM-dd hh:mm:ss";
     */
    var o = {
        "M+" : this.getMonth() + 1, //month
        "d+" : this.getDate(), //day
        "h+" : this.getHours(), //hour
        "m+" : this.getMinutes(), //minute
        "s+" : this.getSeconds(), //second
        "q+" : Math.floor((this.getMonth() + 3) / 3), //quarter
        "S" : this.getMilliseconds()
        //millisecond
    }

    if(/(Y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for(var k in o) {
        if(new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}
/**
 formatDate
 */
var formatDate = (function() {
    return function(dateStr, format) {
        return new Date(dateStr).format(format);
    }
})();

/**
 * 把第一个有图的放在最前
 */
function sortList(list) {
    var _list = list;
    for( i = 0; ln = _list.length, i < ln; i++) {
        _list[i].oi=i;
    }
    if(!(i == 0 && _list[0].image && _list[0].image.type == 'image')) {
        for( i = 1; ln = _list.length, i < ln; i++) {

            if(_list[i].image && _list[i].image.type == 'image') {
                Array.prototype.unshift.apply(_list, _list.splice(i, 1));
                //将当前位置数据移动到数组头部
                break;
            }

            _list.havenoimg = true;
        }
    }
    return _list;
}

//image
/**
 * imgFilter
 */
function imgFilter(url, size) {
    size = size || 't';
    var reg = /\.[lmst]\./i;
    if(!!url && reg.test(url))
        return url.replace(reg, '.' + size + '.');
    else
        return url;
}

/**
 * imgRetry
 */

function imgRetry(img) {
    var $photo = $(img);
    var $photoFrame = $photo.parent();
    var photolink = img.getAttribute('data-original')+'?r=' + Date.now();
    var retrytimes=0;
    if($photoFrame.attr('status') != undefined) return;
    if(!$photo.prev().length) $photo.before('<span>&nbsp;<\/span>');
    $photo.prev().text('点击查看图片');
    $photoFrame.attr('status', '-1');//@si
    $photoFrame.status = -1;         //@si
    $photoFrame[0].reload = function() {
        retrytimes ++;
        $photo.prev().text('加载中');
        $('<img />').bind('load', function() {
            img.src = photolink;
            img.status = 1;
            $photoFrame.attr('status', '1'); //@si
            $photoFrame.status = 1;          //@si
            $photo.prev().text(img.alt);
            $photo.show().prev().hide();
            imgGoldenSection(img, this);
        }).error(function() {
                if(retrytimes>1){
                    $photo.prev().text('图片加载出错');
                    //$photoFrame.attr('status', '-2'); //@si
                    //$photoFrame.status = -2;          //@si
                    $photoFrame[0].reload = function(){};

                    return;
                }
                $photo.prev().text('点击查看图片');
                photolink = img.getAttribute('data-original-original');
                $photoFrame[0].reload();

            }).attr("src", photolink);

    }
}


/**
 * imgGoldenSection
 */
function imgGoldenSection(img, imgObj, resizeCallback) {
    var $photo = $(img);
    var $photoFrame = $photo.parent();
    $photo.width = imgObj.width;
    $photo.height = imgObj.height;
    $photoFrame.width = $photoFrame.width();
    $photoFrame.height = $photoFrame.height();
    $photoFrame.attr('status', '1'); //@si
    $photoFrame.status = 1;          //@si
    //if(!photoFrame[0].style.height || !photoFrame[0].style.lineHeight) {
    if($photoFrame.data('adaptive') != undefined) {
        //var h = photo.height;//photoFrame.width * (photo.height / photo.width);
        var h = $photoFrame.width * ($photo.height / $photo.width);
        $photo.css({
            'width' : $photoFrame.width,
            'height' : h + 'px'
        });

        if($photoFrame.data('adaptive') == true){
            $photoFrame.css({
                'height' : h + 'px',
                'line-height' : h + 'px'
            });
            resizeCallback && resizeCallback();
            $(window).trigger('scroll'); //强行触发图片懒加载
        }
    } else {
        $photo.w8h = $photo.width / $photo.height;
        $photoFrame.w8h = $photoFrame.width / $photoFrame.height;
        var pw, ph, mtop = mleft = 0, gs = 1 - Math.sin(Math.PI / 10) * 2;
        if($photo.w8h > $photoFrame.w8h) {//图宽了 按容器高度缩放 宽度黄金分
            pw = $photoFrame.height * $photo.w8h;
            ph = $photoFrame.height;
            mleft = -(gs * pw - $photoFrame.width / 2);
            if(mleft > 0){
                mleft = -(pw - $photoFrame.width)/3;
            }
        } else if($photo.w8h < $photoFrame.w8h) {//图高了 按容器宽度缩放 高度黄金分
            pw = $photoFrame.width;
            ph = $photoFrame.width / $photo.w8h;
            mtop = -(gs * ph - $photoFrame.height / 2);
            if(mtop > 0){
                mtop = -(ph - $photoFrame.height)/3;
            }
        } else {
            pw = $photoFrame.width;
            ph = $photoFrame.height;
        }
        $photo.css({
            opacity:0,
            width:pw,
            height:ph,
            marginTop:mtop,
            marginLeft:mleft
        });

        $photo.fadeTo(0,1); //fix 图片尺寸突变

    }
}





