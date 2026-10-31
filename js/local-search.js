/* global CONFIG */

/**
 * 增强版本地搜索：等 XML 数据加载完才允许搜索，加载期间缓存输入
 * 覆盖 Fluid 主题自带的 local-search.js（project source 优先级高于 theme source）
 */
(function() {
  'use strict';

  var SEARCH_PATH = (window.CONFIG && CONFIG.search_path) || '/local-search.xml';
  var SEARCH_SELECTOR = '#local-search-input';
  var RESULT_SELECTOR = '#local-search-result';

  var $input = null;
  var $result = null;
  var dataList = null;        // 搜索数据
  var loadPromise = null;     // 加载 Promise
  var cachedQuery = '';       // 加载期间缓存的搜索词

  /**
   * 初始化 DOM 引用
   */
  function initDom() {
    $input = jQuery(SEARCH_SELECTOR);
    $result = jQuery(RESULT_SELECTOR);
    if ($input.length === 0 || $result.length === 0) {
      throw Error('Search DOM elements not found');
    }
  }

  /**
   * 加载并解析搜索 XML
   */
  function loadSearchData() {
    if (loadPromise) return loadPromise;

    showLoading();

    loadPromise = jQuery.ajax({
      url: SEARCH_PATH,
      dataType: 'xml'
    }).then(function(xmlResponse) {
      dataList = jQuery('entry', xmlResponse).map(function() {
        return {
          title: jQuery('title', this).text(),
          content: jQuery('content', this).text(),
          url: jQuery('url', this).text()
        };
      }).get();
      hideLoading();
      return dataList;
    }).catch(function(err) {
      hideLoading();
      $result.html('<div class="m-auto text-center text-danger">加载搜索索引失败，请刷新页面重试</div>');
      throw err;
    });

    return loadPromise;
  }

  /**
   * 显示加载状态（禁用输入框）
   */
  function showLoading() {
    $result.html(
      '<div class="m-auto text-center">' +
        '<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>' +
        '<br/>加载中...' +
      '</div>'
    );
    $input.prop('disabled', true).attr('placeholder', '加载搜索索引中...');
  }

  /**
   * 隐藏加载状态（启用输入框）
   */
  function hideLoading() {
    $input.prop('disabled', false).attr('placeholder', '输入关键词搜索...').focus();
    if ($result.find('.spinner-border').length > 0) {
      $result.html('');
    }
  }

  /**
   * 执行搜索
   */
  function executeSearch(query) {
    if (!dataList) return; // 数据未加载完，不执行

    cachedQuery = query;
    var content = query.trim();

    if (content.length <= 0) {
      $result.html('');
      $input.removeClass('invalid').removeClass('valid');
      return;
    }

    var keywords = content.toLowerCase().split(/[\s-]+/);
    var resultHTML = '';

    dataList.forEach(function(data) {
      var isMatch = true;
      var title = (data.title || '').trim() || 'Untitled';
      var origTitle = title;
      var titleLower = title.toLowerCase();
      var contentText = (data.content || '').trim().replace(/<[^>]+>/g, '');
      var contentLower = contentText.toLowerCase();
      var firstOccur = -1;

      if (CONFIG.include_content_in_search && contentText === '') {
        isMatch = false;
      } else {
        for (var i = 0; i < keywords.length; i++) {
          var kw = keywords[i];
          var idxTitle = titleLower.indexOf(kw);
          var idxContent = contentLower.indexOf(kw);

          if (idxTitle < 0 && idxContent < 0) {
            isMatch = false;
            break;
          }
          if (idxContent >= 0 && i === 0) {
            firstOccur = idxContent;
          }
        }
      }

      if (isMatch) {
        resultHTML += '<a href="' + data.url + '" class="list-group-item list-group-item-action font-weight-bolder search-list-title">' + origTitle + '</a>';

        if (firstOccur >= 0) {
          var start = Math.max(0, firstOccur - 20);
          var end = Math.min(contentText.length, firstOccur + 80);
          var matchContent = contentText.substring(start, end);

          keywords.forEach(function(kw) {
            var regS = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            matchContent = matchContent.replace(regS, '<span class="search-word">' + kw + '</span>');
          });

          resultHTML += '<p class="search-list-content">' + matchContent + '...</p>';
        }
      }
    });

    if (!resultHTML) {
      $input.addClass('invalid').removeClass('valid');
      $result.html('');
    } else {
      $input.addClass('valid').removeClass('invalid');
      $result.html(resultHTML);
    }
  }

  /**
   * 绑定输入事件（事件委托，立即绑定）
   */
  function bindInputEvent() {
    $input.on('input', function() {
      var query = $input.val();

      if (dataList) {
        // 已加载完成，实时搜索
        executeSearch(query);
      } else {
        // 还未加载完，缓存搜索词
        cachedQuery = query;
        // 确保加载完成后自动执行（只绑定一次）
        if (!loadPromise._bound) {
          loadPromise._bound = true;
          loadPromise.then(function() {
            if (cachedQuery.trim().length > 0) {
              executeSearch(cachedQuery);
            }
          });
        }
      }
    });
  }

  /**
   * 关闭/重置
   */
  function reset() {
    if ($input) {
      $input.val('').removeClass('invalid').removeClass('valid');
    }
    if ($result) {
      $result.html('');
    }
    cachedQuery = '';
    dataList = null;
    loadPromise = null;
  }

  // ====== 初始化 ======
  function init() {
    initDom();
    bindInputEvent();

    var modal = jQuery('#modalSearch');

    modal.off('show.bs.modal');
    modal.off('shown.bs.modal');
    modal.off('hidden.bs.modal');

    modal.on('show.bs.modal', function() {
      loadSearchData();
    });

    modal.on('shown.bs.modal', function() {
      if ($input && !$input.prop('disabled')) {
        $input.focus();
      }
    });

    modal.on('hidden.bs.modal', function() {
      reset();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
