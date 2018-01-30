import './pdfViewer.scss';
import React, {
  Component
} from 'react';
import PropTypes from 'prop-types';
import 'pdfjs-dist/lib/shared/compatibility';
import 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.js';
PDFJS.workerSrc = workerSrc;
var docPageNumChanged = false;
var docScrollMoved = false;
var docCanvasHeight = 0;
var tempScale = 1;

export default class PDFViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pages: [],
      defaultViewport: null,
      scale: 0,
      totalPageNum: 0,
      currentPageNum: 1,
      rotate: 0
    };
    this.render = this.render.bind(this);
    this.initPDF = this.initPDF.bind(this);
    this.drawCanvas = this.drawCanvas.bind(this);
    this.asyncDrawPDF = this.asyncDrawPDF.bind(this);
    this.drawPDF = this.drawPDF.bind(this);
    this.calcRotate = this.calcRotate.bind(this);
    this.handleChangeScale = this.handleChangeScale.bind(this);
    this.handleReduceScale = this.handleReduceScale.bind(this);
    this.handleIncreaseScale = this.handleIncreaseScale.bind(this);
    this.handleChangePageNum = this.handleChangePageNum.bind(this);
    this.handleReducePageNum = this.handleReducePageNum.bind(this);
    this.handleIncreasePageNum = this.handleIncreasePageNum.bind(this);
    this.handleRotateCW = this.handleRotateCW.bind(this);
    this.handleRotateCCW = this.handleRotateCCW.bind(this);
    this.handleChangeScroll = this.handleChangeScroll.bind(this);
  }

  componentDidMount() {
    if (this.props.file) {
      this.initPDF(this.props.file);
    } else {
      this.refs.loadingBar.className = "hidden";
      this.refs.docError.className = "errorContainer";
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.file != nextProps.file) {
      this.initPDF(nextProps.file);
    } else if (!this.props.file && !nextProps.file) {
      this.refs.loadingBar.className = "hidden";
      this.refs.docError.className = "errorContainer";
    }
  }

  componentDidUpdate() {
    if (!this.state.pages || this.state.pages.length == 0) {
      return;
    }
    if (docScrollMoved) {
      docScrollMoved = false;
      return;
    }
    if (docPageNumChanged) {
      this.refs.docView.scrollTop = (this.state.currentPageNum - 1) * (docCanvasHeight + 18);
      docPageNumChanged = false;
      return;
    }
    this.drawCanvas();
    this.refs.loadingBar.className = "hidden";
    this.refs.docError.className = "hidden";
  }

  initPDF(fileName) {
    this.refs.loadingBar.className = "loadingBar";
    this.refs.docError.className = "hidden";
    var _this = this;
    try {
      PDFJS.getDocument(fileName).then(function(pdf) {
        _this.refs.numPages.innerText = "/" + pdf.numPages + "页";
        if (pdf.numPages > 0) {
          Promise.all(Object.keys(Array.apply(null, {
            length: pdf.numPages
          })).map(function(item) {
            return pdf.getPage(parseInt(item) + 1);
          })).then(function(pages) {
            var _defaultViewport = pages[0].getViewport(1);
            _this.setState({
              totalPageNum: pdf.numPages,
              pages: pages,
              defaultViewport: _defaultViewport
            });
          });
        } else {
          _this.refs.loadingBar.className = "hidden";
          _this.refs.docError.className = "errorContainer";
        }
      }).catch(function() {
        _this.refs.loadingBar.className = "hidden";
        _this.refs.docError.className = "errorContainer";
      });
    } catch (ex) {
      _this.refs.loadingBar.className = "hidden";
      _this.refs.docError.className = "errorContainer";
    }
  }

  drawCanvas() {
    var i = 0,
      _len = this.state.pages.length,
      _scale = this.state.scale || 1;
    if (_scale == -1 && (this.state.rotate == 90 || this.state.rotate == 270)) {
      //适应宽度, 横向
      _scale = (this.refs.docView.offsetWidth - 40) / this.state.defaultViewport.height;
    } else if (_scale == -1) {
      //适应宽度, 纵向
      _scale = (this.refs.docView.offsetWidth - 40) / this.state.defaultViewport.width;
    } else if (_scale == -2 && (this.state.rotate == 90 || this.state.rotate == 270)) {
      //适应页面, 横向
      _scale = Math.min((this.refs.docView.offsetWidth - 40) / this.state.defaultViewport.height, (this.refs.docView.offsetHeight - 18) / this.state.defaultViewport.width);
    } else if (_scale == -2) {
      //适应页面, 纵向
      _scale = Math.min((this.refs.docView.offsetWidth - 40) / this.state.defaultViewport.width, (this.refs.docView.offsetHeight - 18) / this.state.defaultViewport.height);
    }
    tempScale = _scale == 0 ? tempScale : _scale;
    var _doc = this.refs.docReader,
      _viewport = this.calcRotate(this.state.rotate, _scale),
      _canvas;
    docCanvasHeight = _viewport.height;
    var _showPageCount = Math.ceil(this.refs.docView.offsetHeight / docCanvasHeight);
    if (_doc.childNodes.length > 0) {
      for (i; i < _len; i++) {
        _canvas = _doc.childNodes[i];
        _canvas.height = _viewport.height;
        _canvas.width = _viewport.width;
        _canvas.setAttribute('data-load', '0');
        if (i >= (this.state.currentPageNum - 1) && i <= (this.state.currentPageNum + _showPageCount - 1)) {
          this.drawPDF(i, _canvas, _viewport);
        }
      }
    } else {
      for (i; i < _len; i++) {
        _canvas = document.createElement('canvas');
        _canvas.height = _viewport.height;
        _canvas.width = _viewport.width;
        _canvas.setAttribute('data-load', '0');
        _doc.appendChild(_canvas);
        if (i >= (this.state.currentPageNum - 1) && i <= (this.state.currentPageNum + _showPageCount - 1)) {
          this.drawPDF(i, _canvas, _viewport);
        }
      }
    }
  }

  asyncDrawPDF(index) {
    var _showPageCount = Math.ceil(this.refs.docView.offsetHeight / docCanvasHeight);
    var _viewport = this.calcRotate(this.state.rotate, tempScale);
    if (this.state.pages[index - 1]) {
      this.drawPDF(index - 1, this.refs.docReader.childNodes[index - 1], _viewport);
    }
    for (var i = 0; i < _showPageCount; i++) {
      if (this.state.pages[index + i]) {
        this.drawPDF(index + i, this.refs.docReader.childNodes[index + i], _viewport);
      } else if (this.state.pages[index - i]) {
        this.drawPDF(index - i, this.refs.docReader.childNodes[index - i], _viewport);
      }
    }
  }

  drawPDF(index, canvasTag, viewport) {
    if (parseInt(canvasTag.getAttribute('data-load')) == 0) {
      var _context = canvasTag.getContext('2d');
      _context.clearRect(0, 0, canvasTag.width, canvasTag.height);
      var _renderContext = {
        canvasContext: _context,
        viewport: viewport
      };
      this.state.pages[index].render(_renderContext);
      canvasTag.setAttribute('data-load', '1');
    }
  }

  calcRotate(rotation, scale) {
    var _defaultViewport = this.state.defaultViewport;
    var centerX = (_defaultViewport.viewBox[2] + _defaultViewport.viewBox[0]) / 2;
    var centerY = (_defaultViewport.viewBox[3] + _defaultViewport.viewBox[1]) / 2;
    var _rotateA, _rotateB, _rotateC, _rotateD;
    switch (rotation) {
      case 180:
        _rotateA = -1;
        _rotateB = 0;
        _rotateC = 0;
        _rotateD = 1;
        break;
      case 90:
        _rotateA = 0;
        _rotateB = 1;
        _rotateC = 1;
        _rotateD = 0;
        break;
      case 270:
        _rotateA = 0;
        _rotateB = -1;
        _rotateC = -1;
        _rotateD = 0;
        break;
      default:
        _rotateA = 1;
        _rotateB = 0;
        _rotateC = 0;
        _rotateD = -1;
        break;
    }
    var offsetCanvasX, offsetCanvasY;
    var width, height;
    if (_rotateA === 0) {
      offsetCanvasX = Math.abs(centerY - _defaultViewport.viewBox[1]) * scale + _defaultViewport.offsetX;
      offsetCanvasY = Math.abs(centerX - _defaultViewport.viewBox[0]) * scale + _defaultViewport.offsetY;
      width = Math.abs(_defaultViewport.viewBox[3] - _defaultViewport.viewBox[1]) * scale;
      height = Math.abs(_defaultViewport.viewBox[2] - _defaultViewport.viewBox[0]) * scale;
    } else {
      offsetCanvasX = Math.abs(centerX - _defaultViewport.viewBox[0]) * scale + _defaultViewport.offsetX;
      offsetCanvasY = Math.abs(centerY - _defaultViewport.viewBox[1]) * scale + _defaultViewport.offsetY;
      width = Math.abs(_defaultViewport.viewBox[2] - _defaultViewport.viewBox[0]) * scale;
      height = Math.abs(_defaultViewport.viewBox[3] - _defaultViewport.viewBox[1]) * scale;
    }
    var _ret = {};
    _ret.transform = [
      _rotateA * scale,
      _rotateB * scale,
      _rotateC * scale,
      _rotateD * scale,
      offsetCanvasX - _rotateA * scale * centerX - _rotateC * scale * centerY,
      offsetCanvasY - _rotateB * scale * centerX - _rotateD * scale * centerY
    ];
    _ret.viewBox = _defaultViewport.viewBox;
    _ret.scale = scale;
    _ret.rotation = rotation;
    _ret.offsetX = _defaultViewport.offsetX;
    _ret.offsetY = _defaultViewport.offsetY;
    _ret.width = width;
    _ret.height = height;
    _ret.fontScale = scale;
    return _ret;
  }

  handleChangeScale(e) {
    var _scale = parseFloat(e.target.value);
    this.setState({
      scale: _scale
    });
  }

  handleReduceScale() {
    var _scale = this.state.scale <= 0 ? tempScale : this.state.scale;
    _scale = (_scale / this.props.defaultScale).toFixed(2);
    _scale = Math.floor(_scale * 10) / 10;
    _scale = Math.max(this.props.minScale, _scale);
    this.setState({
      scale: _scale
    });
  }

  handleIncreaseScale() {
    var _scale = this.state.scale <= 0 ? tempScale : this.state.scale;
    _scale = (_scale * this.props.defaultScale).toFixed(2);
    _scale = Math.ceil(_scale * 10) / 10;
    _scale = Math.min(this.props.maxScale, _scale);
    this.setState({
      scale: _scale
    });
  }

  handleChangePageNum(e) {
    var _pageNum = e.target.value;
    if (_pageNum < 1) {
      _pageNum = 1;
    } else if (_pageNum > this.state.totalPageNum) {
      _pageNum = this.state.totalPageNum;
    }
    if (_pageNum != this.state.currentPageNum) {
      docPageNumChanged = true;
      this.setState({
        currentPageNum: _pageNum
      });
      this.asyncDrawPDF(_pageNum);
    }
  }

  handleReducePageNum() {
    var _pageNum = this.state.currentPageNum;
    if (_pageNum <= 1) {
      return;
    }
    docPageNumChanged = true;
    this.setState({
      currentPageNum: _pageNum - 1
    });
    this.asyncDrawPDF(_pageNum - 1);
  }

  handleIncreasePageNum() {
    var _pageNum = this.state.currentPageNum;
    if (_pageNum >= this.state.totalPageNum) {
      return;
    }
    docPageNumChanged = true;
    this.setState({
      currentPageNum: _pageNum + 1
    });
    this.asyncDrawPDF(_pageNum + 1);
  }

  handleRotateCW() {
    var _rotate = this.state.rotate;
    _rotate = _rotate == 360 ? 90 : _rotate + 90;
    this.setState({
      rotate: _rotate
    });
  }

  handleRotateCCW() {
    var _rotate = this.state.rotate;
    _rotate = _rotate == 0 ? 270 : _rotate - 90;
    this.setState({
      rotate: _rotate
    });
  }

  handleChangeScroll(e) {
    var _page = 1;
    if ((e.target.scrollTop + e.target.clientHeight) == e.target.scrollHeight) {
      _page = this.state.totalPageNum;
    } else if (this.state.scale > 1) {
      var _needAddPageNum = ((docCanvasHeight - e.target.scrollTop % (docCanvasHeight + 18)) / this.refs.docView.offsetHeight) < 0.5 ? 1 : 0;
      _page = Math.floor(e.target.scrollTop / (docCanvasHeight + 18)) + _needAddPageNum + 1;
    } else {
      _page = Math.round(e.target.scrollTop / (docCanvasHeight + 18)) + 1;
    }
    if (_page != this.state.currentPageNum) {
      docScrollMoved = true;
      this.setState({
        currentPageNum: _page
      });
      this.asyncDrawPDF(_page);
    }
  }

  render() {
    return (<div className="outerContainer docviewer">
      <div className="mainContainer">
        <div className="toolbarContainer">
          <div className="toolbarViewer">
            <div className="toolbarViewer-left">
              <div className="splitToolbarButton">
                <button className="toolbarButton pageUp" 
                  disabled={this.state.currentPageNum == 1 ? "disabled" : false}
                  onClick={this.handleReducePageNum}
                  title="上一页">
                  <span>上一页</span>
                </button>
                <div className="splitToolbarButtonSeparator"></div>
                <button className="toolbarButton pageDown" 
                  disabled={this.state.currentPageNum == this.state.totalPageNum || this.state.totalPageNum == 0 ? "disabled" : false}
                  onClick={this.handleIncreasePageNum}
                  title="下一页">
                  <span>下一页</span>
                </button>
              </div>
              <input type="number" 
                className="toolbarField pageNumber" 
                title={"页面：" + this.state.currentPageNum}
                onChange={this.handleChangePageNum} 
                value={this.state.currentPageNum} 
                size="4" 
                min="1" />
              <span ref="numPages" className="toolbarLabel">/0页</span>
            </div>
            <div className="toolbarViewer-right">
              <button className="toolbarButton rotateCw" onClick={this.handleRotateCW} title="顺时针旋转" >
                <span>顺时针旋转</span>
              </button>
              <button className="toolbarButton rotateCcw" onClick={this.handleRotateCCW} title="逆时针旋转">
                <span>逆时针旋转</span>
              </button>
            </div>
            <div className="outerCenter">
              <div className="innerCenter toolbarViewerMiddle">
                <div className="splitToolbarButton">
                  <button className="toolbarButton zoomOut" disabled={this.state.scale > this.props.minScale || this.state.scale == 0 || this.state.scale == -1 || this.state.scale == -2 ? false: "disabled"} onClick={this.handleReduceScale} title="缩小">
                    <span>缩小</span>
                  </button>
                  <div className="splitToolbarButtonSeparator"></div>
                  <button className="toolbarButton zoomIn" disabled={this.state.scale < this.props.maxScale ? false: "disabled"} title="放大" onClick={this.handleIncreaseScale}>
                    <span>放大</span>
                   </button>
                </div>
                <span className="dropdownToolbarButton">
                  <select title="缩放" value={this.state.scale} onChange={this.handleChangeScale}>
                    <option value="0">自动缩放</option>
                    <option value="1.01">实际大小</option>
                    <option value="-2">适合页面</option>
                    <option value="-1">适合页宽</option>
                    <option value="0.5">50%</option>
                    <option value="0.75">75%</option>
                    <option value="1">100%</option>
                    <option value="1.25">125%</option>
                    <option value="1.5">150%</option>
                    <option value="2">200%</option>
                    <option value="3">300%</option>
                    <option value="4">400%</option>
                    <option className="hidden" value={this.state.scale}>{(this.state.scale * 100).toFixed(0) + "%"}</option>
                  </select>
                </span>
              </div>
            </div>
          </div>
          <div ref="loadingBar" className="loadingBar">
            <div className="progress">
            </div>
          </div>
        </div>
        <div ref="docView" className="viewerContainer" onScroll={this.handleChangeScroll}>
          <div ref="docReader" className="pdfViewer"></div>
        </div>
        <div ref="docError" className="hidden"><span>文档打开失败，请重试</span></div>
      </div>
    </div>);
  }
}

PDFViewer.defaultProps = {
  defaultScale: 1.1,
  minScale: 0.25,
  maxScale: 10.0,
  file: ''
};

PDFViewer.propTypes = {
  defaultScale: PropTypes.number.isRequired,
  minScale: PropTypes.number.isRequired,
  maxScale: PropTypes.number.isRequired,
  file: PropTypes.string.isRequired
};