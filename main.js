const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFDocument, PageSizes } = require('pdf-lib');

/**
 * 主进程控制类
 * 作者: qxh
 * 功能: 管理Electron应用生命周期和PDF处理
 */
class MainProcess {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  }

  /**
   * 获取带有日期时间的默认文件名
   * @returns {string} 格式化的文件名
   */
  getDefaultFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `merged_${year}_${month}_${day}_${hours}_${minutes}_${seconds}.pdf`;
  }

  /**
   * 创建主窗口
   */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'PDF合并工具',
      // 暂时移除图标配置，避免找不到文件报错
      // icon: path.join(__dirname, 'assets/icon.png'),
      show: false // 等待ready-to-show事件
    });

    // 加载应用
    const startUrl = this.isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, 'build/index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    // 窗口准备好后显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // 开发环境打开开发者工具
    if (this.isDev) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  /**
   * 初始化IPC通信监听器
   */
  initIPC() {
    // 选择PDF文件
    ipcMain.handle('select-pdf-files', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        title: '选择PDF文件',
        filters: [
          { name: 'PDF文件', extensions: ['pdf'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      if (result.canceled) {
        return { success: false, files: [] };
      }

      return { success: true, files: result.filePaths };
    });

    // 选择导出路径
    ipcMain.handle('select-export-path', async () => {
      const result = await dialog.showSaveDialog(this.mainWindow, {
        title: '选择导出路径',
        defaultPath: this.getDefaultFileName(),
        filters: [
          { name: 'PDF文件', extensions: ['pdf'] }
        ]
      });

      if (result.canceled) {
        return { success: false, path: '' };
      }

      return { success: true, path: result.filePath };
    });

    // 合并PDF文件
    ipcMain.handle('merge-pdfs', async (event, { inputFiles, outputPath, pagesPerSheet, orientation }) => {
      try {
        await this.mergePDFs(inputFiles, outputPath, pagesPerSheet, orientation);
        
        // 合并成功后，打开输出文件所在的文件夹
        const outputDir = path.dirname(outputPath);
        await shell.openPath(outputDir);
        
        return { success: true, message: '合并完成' };
      } catch (error) {
        console.error('PDF合并失败:', error);
        return { success: false, message: error.message };
      }
    });
  }

  /**
   * PDF合并核心逻辑 - 简化版
   * @param {string[]} inputFiles 输入文件路径数组
   * @param {string} outputPath 输出文件路径
   * @param {number} pagesPerSheet 每页合并的PDF数量
   * @param {string} orientation 页面方向，'portrait'或'landscape'
   */
  async mergePDFs(inputFiles, outputPath, pagesPerSheet, orientation = 'portrait') {
    try {
      // 确保有文件可处理
      if (inputFiles.length === 0) {
        throw new Error('没有提供输入文件');
      }

      // 创建新的PDF文档
      const mergedPdf = await PDFDocument.create();
      
      // 根据方向选择页面尺寸
      const pageSize = orientation === 'landscape' 
        ? [PageSizes.A4[1], PageSizes.A4[0]]  // 横向：宽高互换
        : PageSizes.A4;                       // 纵向：标准A4
      
      // 收集所有输入PDF
      const inputPdfs = [];
      for (const filePath of inputFiles) {
        try {
          const pdfBytes = fs.readFileSync(filePath);
          const pdf = await PDFDocument.load(pdfBytes);
          if (pdf.getPageCount() > 0) {
            inputPdfs.push(pdf);
          } else {
            console.warn(`警告: PDF文件 ${filePath} 没有页面，已跳过`);
          }
        } catch (error) {
          console.error(`无法加载文件 ${filePath}:`, error);
        }
      }
      
      if (inputPdfs.length === 0) {
        throw new Error('没有有效的PDF文件可以处理');
      }
      
      // 简化版: 按照指定数量分批创建新页面，每个新页面包含N个输入PDF的第一页
      for (let i = 0; i < inputPdfs.length; i += pagesPerSheet) {
        // 当前批次的PDF
        const batchPdfs = inputPdfs.slice(i, Math.min(i + pagesPerSheet, inputPdfs.length));
        
        // 创建一个新页面，尺寸根据方向设置
        const newPage = mergedPdf.addPage(pageSize);
        const { width: pageWidth, height: pageHeight } = newPage.getSize();
        
        // 设置页面边距 - 调小边距增加可用空间
        const marginX = pageWidth * 0.02;  // 水平边距为页面宽度的2%
        const marginY = pageHeight * 0.01; // 垂直边距为页面高度的1%，减小垂直方向边距
        
        // 计算可用区域尺寸
        const availableWidth = pageWidth - (marginX * 2);
        const availableHeight = pageHeight - (marginY * 2);
        
        // 计算网格布局 - 根据方向调整行列比例
        let cols, rows;
        if (orientation === 'landscape') {
          // 横向模式 - 确保布局与预览一致
          switch(pagesPerSheet) {
            case 2:
              cols = 2;
              rows = 1;
              break;
            case 4:
              cols = 2;
              rows = 2;
              break;
            case 6:
              cols = 3;
              rows = 2;
              break;
            case 8:
              cols = 4;
              rows = 2;
              break;
            case 10:
              cols = 5;
              rows = 2;
              break;
            default:
              // 默认横向布局，优先增加列数
              cols = Math.ceil(Math.sqrt(pagesPerSheet * (pageWidth / pageHeight)));
              rows = Math.ceil(pagesPerSheet / cols);
          }
        } else {
          // 纵向模式下，修改为上下排布
          // 针对不同数量使用不同的行列布局
          switch(pagesPerSheet) {
            case 2:
              cols = 1;
              rows = 2;
              break;
            case 4:
              cols = 2;
              rows = 2;
              break;
            case 6:
              cols = 2;
              rows = 3;
              break;
            case 8:
              cols = 2;
              rows = 4;
              break;
            case 10:
              cols = 2;
              rows = 5;
              break;
            default:
              // 默认上下排布，优先增加行数
              rows = Math.ceil(Math.sqrt(pagesPerSheet));
              cols = Math.ceil(pagesPerSheet / rows);
          }
        }
        
        // 每个PDF区域的尺寸
        const cellWidth = availableWidth / cols;
        
        // 纵向模式下优化行高分配，减小上下间距
        let cellHeight;
        if (orientation === 'portrait') {
          // 纵向模式下根据页数调整行高
          // 当页数较多时，进一步压缩行高
          if (rows >= 4) {
            // 4行或以上时，压缩更多
            cellHeight = availableHeight / (rows * 0.95); // 稍微增加可用高度
          } else if (rows >= 3) {
            // 3行时，小幅压缩
            cellHeight = availableHeight / (rows * 0.97);
          } else {
            // 2行或更少时，正常计算
            cellHeight = availableHeight / rows;
          }
        } else {
          // 横向模式下正常计算
          cellHeight = availableHeight / rows;
        }
        
        // 设置单元格间距 - 减小间距使页面更紧凑
        const cellSpacingX = cellWidth * 0.01;  // 水平间距为单元格宽度的1%
        let cellSpacingY;
        
        // 根据方向调整垂直间距
        if (orientation === 'portrait') {
          // 纵向模式下，进一步减小垂直间距
          cellSpacingY = cellHeight * 0.005; // 只有0.5%的垂直间距
        } else {
          // 横向模式保持原来的间距
          cellSpacingY = cellHeight * 0.01;
        }
        
        // 实际可用的单元格内部尺寸
        const innerCellWidth = cellWidth - (cellSpacingX * 2);
        const innerCellHeight = cellHeight - (cellSpacingY * 2);
        
        // 依次复制每个PDF的第一页
        for (let j = 0; j < batchPdfs.length; j++) {
          try {
            // 根据方向不同，计算不同的行列位置
            let row, col;
            
            if (orientation === 'landscape') {
              // 横向模式 - 从左到右，从上到下排列
              row = Math.floor(j / cols);
              col = j % cols;
            } else {
              // 纵向模式 - 从上到下，从左到右排列（列优先）
              // 转换索引 j 以实现列优先排列
              const columnIndex = Math.floor(j / rows); // 当前列
              const rowIndex = j % rows;               // 当前行
              
              row = rowIndex;
              col = columnIndex;
            }
            
            // 复制当前PDF的第一页
            const [copiedPage] = await mergedPdf.copyPages(batchPdfs[j], [0]);
            
            // 添加这个页面到新文档
            const embeddedPage = await mergedPdf.embedPage(copiedPage);
            const { width: origWidth, height: origHeight } = embeddedPage;
            
            // 计算缩放比例
            const scaleX = innerCellWidth / origWidth;
            const scaleY = innerCellHeight / origHeight;
            
            // 根据方向调整缩放比例
            let scale;
            if (orientation === 'portrait') {
              // 纵向模式下，增加垂直方向的填充比例
              scale = Math.min(scaleX, scaleY * 1.02) * 0.99;
            } else {
              // 横向模式下的比例
              scale = Math.min(scaleX, scaleY) * 0.98;
            }
            
            // 计算位置
            const scaledWidth = origWidth * scale;
            const scaledHeight = origHeight * scale;
            
            // 计算单元格左上角位置
            const cellX = marginX + (col * cellWidth);
            let cellY;
            
            if (orientation === 'portrait') {
              // 纵向模式下，调整垂直方向的位置，使行与行之间更紧凑
              // 减少行间空白
              const rowSpacing = rows > 2 ? rows * 0.05 : 0; // 根据行数调整
              cellY = pageHeight - marginY - ((row + 1) * cellHeight) + (rowSpacing * cellHeight * row / rows);
            } else {
              // 横向模式正常计算
              cellY = pageHeight - marginY - ((row + 1) * cellHeight);
            }
            
            // 在单元格内居中
            const x = cellX + (cellWidth - scaledWidth) / 2;
            const y = cellY + (cellHeight - scaledHeight) / 2;
            
            // 在新页面上绘制这个页面
            newPage.drawPage(embeddedPage, {
              x: x,
              y: y,
              width: scaledWidth,
              height: scaledHeight,
            });
          } catch (error) {
            console.error(`处理批次 ${i}，PDF ${j} 时出错:`, error);
          }
        }
      }
      
      // 保存合并后的PDF
      const pdfBytes = await mergedPdf.save();
      fs.writeFileSync(outputPath, pdfBytes);
      return true;
    } catch (error) {
      console.error('PDF合并过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 初始化应用
   */
  init() {
    // 应用准备就绪
    app.whenReady().then(() => {
      this.createWindow();
      this.initIPC();
    });

    // 所有窗口关闭时退出应用（macOS除外）
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // macOS激活应用时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }
}

// 启动应用
const mainProcess = new MainProcess();
mainProcess.init(); 