const { contextBridge, ipcRenderer } = require('electron');

/**
 * 预加载脚本 - 安全的前后端通信桥梁
 * 作者: qxh
 * 功能: 为渲染进程提供安全的API接口
 */

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 选择PDF文件
   * @returns {Promise<{success: boolean, files: string[]}>}
   */
  selectPDFFiles: () => ipcRenderer.invoke('select-pdf-files'),

  /**
   * 选择导出路径
   * @returns {Promise<{success: boolean, path: string}>}
   */
  selectExportPath: () => ipcRenderer.invoke('select-export-path'),

  /**
   * 合并PDF文件
   * @param {Object} params 合并参数
   * @param {string[]} params.inputFiles 输入文件路径数组
   * @param {string} params.outputPath 输出文件路径
   * @param {number} params.pagesPerSheet 每页合并数量
   * @param {string} params.orientation 页面方向，'portrait'或'landscape'
   * @returns {Promise<{success: boolean, message: string}>}
   */
  mergePDFs: (params) => ipcRenderer.invoke('merge-pdfs', params),

  /**
   * 获取平台信息
   */
  platform: process.platform
}); 