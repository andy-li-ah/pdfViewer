import 'babel-polyfill';
import React from 'react';
import ReactDom from 'react-dom';
import PDFViewer from '../components/pdfViewer';

ReactDom.render(
  <div style={{width: '100%', height: '600px'}}>
    <PDFViewer file="./files/compressed.tracemonkey-pldi-09.pdf" />
  </div>,
  document.getElementById('root')
);