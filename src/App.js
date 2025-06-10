import React, { useState } from 'react';
import { 
  Button, 
  Select, 
  Input, 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  message,
  List,
  Tag,
  Divider,
  Upload,
  App as AntdApp
} from 'antd';
import { 
  FileAddOutlined, 
  FolderOpenOutlined, 
  MergeCellsOutlined,
  FilePdfOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import './App.css';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * PDF合并工具主应用组件
 * 作者: qxh
 * 功能: 提供PDF文件选择、合并数量设置、导出路径选择和合并操作的用户界面
 */
function App() {
  // 状态管理
  const [selectedFiles, setSelectedFiles] = useState([]); // 选中的PDF文件列表
  const [mergeCount, setMergeCount] = useState(4); // 合并数量，默认4
  const [pageOrientation, setPageOrientation] = useState('portrait'); // 页面方向，默认纵向
  const [exportPath, setExportPath] = useState(''); // 导出路径
  const [isLoading, setIsLoading] = useState(false); // 加载状态
  const [messageApi, contextHolder] = message.useMessage(); // 使用消息API

  /**
   * 选择PDF文件处理函数
   */
  const handleSelectFiles = async () => {
    try {
      const result = await window.electronAPI.selectPDFFiles();
      if (result.success) {
        // 将文件路径转换为显示对象
        const fileObjects = result.files.map((filePath, index) => ({
          id: Date.now() + index,
          name: filePath.split(/[\\/]/).pop(), // 获取文件名
          path: filePath,
          size: '待获取' // 后续可以添加文件大小获取
        }));
        setSelectedFiles(fileObjects);
        messageApi.success(`已选择 ${fileObjects.length} 个PDF文件`);
      }
    } catch (error) {
      messageApi.error('选择文件失败: ' + error.message);
    }
  };

  /**
   * 删除选中文件
   * @param {number} fileId 文件ID
   */
  const handleRemoveFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
    messageApi.info('已移除文件');
  };

  /**
   * 选择导出路径处理函数
   */
  const handleSelectExportPath = async () => {
    try {
      const result = await window.electronAPI.selectExportPath();
      if (result.success) {
        setExportPath(result.path);
        messageApi.success('导出路径设置成功');
      }
    } catch (error) {
      messageApi.error('选择导出路径失败: ' + error.message);
    }
  };

  /**
   * 执行PDF合并操作
   */
  const handleMerge = async () => {
    // 参数校验
    if (selectedFiles.length === 0) {
      messageApi.warning('请先选择PDF文件');
      return;
    }

    if (!exportPath) {
      messageApi.warning('请选择导出路径');
      return;
    }

    if (selectedFiles.length > 50) {
      messageApi.warning('文件数量过多，请控制在50个以内');
      return;
    }

    setIsLoading(true);
    try {
      const inputFiles = selectedFiles.map(file => file.path);
      const result = await window.electronAPI.mergePDFs({
        inputFiles,
        outputPath: exportPath,
        pagesPerSheet: mergeCount,
        orientation: pageOrientation
      });

      if (result.success) {
        messageApi.success('PDF合并完成！文件夹已自动打开');
        // 可选：清空已选文件
        // setSelectedFiles([]);
      } else {
        messageApi.error('合并失败: ' + result.message);
      }
    } catch (error) {
      messageApi.error('合并操作失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 获取合并选项配置
   */
  const mergeOptions = [
    { value: 2, label: '2张/页' },
    { value: 4, label: '4张/页' },
    { value: 6, label: '6张/页' },
    { value: 8, label: '8张/页' },
    { value: 10, label: '10张/页' }
  ];

  /**
   * 获取页面方向选项配置
   */
  const orientationOptions = [
    { value: 'portrait', label: '纵向(竖版)' },
    { value: 'landscape', label: '横向(横版)' }
  ];

  return (
    <AntdApp>
      {contextHolder}
    <div className="app-container">
      {/* 应用标题 */}
      <div className="app-header">
        <Title level={2}>
          <FilePdfOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          PDF合并工具
        </Title>
        <Text type="secondary">轻松合并多个PDF文件，优化打印体验</Text>
      </div>

      {/* 主要操作区域 */}
      <Row gutter={[16, 16]}>
        {/* 文件选择区域 */}
        <Col span={24}>
          <Card 
              title="选择PDF文件" 
            extra={
              <Tag color="blue">
                已选择 {selectedFiles.length} 个文件
              </Tag>
            }
              styles={{ body: { padding: '16px' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<FileAddOutlined />}
                onClick={handleSelectFiles}
                size="large"
                    style={{ minWidth: '180px', height: '45px' }}
              >
                选择PDF文件
              </Button>
                </div>
              
              {/* 文件列表显示 */}
              {selectedFiles.length > 0 && (
                <List
                  size="small"
                  dataSource={selectedFiles}
                  renderItem={(file) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveFile(file.id)}
                          size="small"
                        >
                          移除
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FilePdfOutlined style={{ color: '#f5222d' }} />}
                        title={file.name}
                        description={file.path}
                      />
                    </List.Item>
                  )}
                  style={{ 
                    maxHeight: 200, 
                    overflowY: 'auto',
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                      padding: 8,
                      marginTop: 16
                  }}
                />
              )}
            </Space>
          </Card>
        </Col>

          {/* 设置区域和合并按钮 - 合并到一个卡片中 */}
          <Col span={24}>
            <Card 
              title="合并设置" 
              extra={<Text type="secondary">设置合并选项并预览效果</Text>}
              styles={{ body: { padding: '16px' } }}
            >
              <Row gutter={[16, 24]}>
                {/* 合并数量设置 */}
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center', padding: '0 10px' }}>
                <Text strong>每页合并数量:</Text>
                <Select
                  value={mergeCount}
                  onChange={setMergeCount}
                  style={{ width: '100%', marginTop: 8 }}
                  size="large"
                >
                  {mergeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>
                </Col>

                {/* 页面方向设置 - 调整顺序 */}
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center', padding: '0 10px' }}>
                    <Text strong>页面方向:</Text>
                    <Select
                      value={pageOrientation}
                      onChange={setPageOrientation}
                      style={{ width: '100%', marginTop: 8 }}
                      size="large"
                    >
                      {orientationOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </div>
        </Col>

                {/* 导出路径设置 */}
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center', padding: '0 10px' }}>
                <Text strong>导出路径:</Text>
                <Input
                  value={exportPath}
                  placeholder="请选择导出路径..."
                  readOnly
                  style={{ marginTop: 8 }}
                  suffix={
                    <Button
                      type="link"
                      icon={<FolderOpenOutlined />}
                      onClick={handleSelectExportPath}
                    >
                      浏览
                    </Button>
                  }
                />
              </div>
                </Col>

                {/* 预览效果 */}
                <Col span={14} style={{ marginTop: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div style={{ border: '1px dashed #d9d9d9', padding: '20px', borderRadius: '8px', background: '#fafafa', width: '100%' }}>
                      <div style={{ textAlign: 'center', marginBottom: 15 }}>
                        <Tag color="green" style={{ fontSize: '16px', padding: '5px 15px', borderRadius: '16px' }}>
                          {mergeCount}张
                        </Tag>
                        <Tag color="blue" style={{ fontSize: '16px', padding: '5px 15px', marginLeft: '10px', borderRadius: '16px' }}>
                          {pageOrientation === 'portrait' ? '纵向' : '横向'}
                        </Tag>
                      </div>
                      <div 
                        style={{ 
                          width: pageOrientation === 'landscape' ? 210 : 180, 
                          height: pageOrientation === 'landscape' ? 150 : 240, 
                          background: 'white', 
                          border: '1px solid #91d5ff',
                          borderRadius: 4,
                          display: 'grid',
                          gridTemplateColumns: 
                            // 设置列数
                            pageOrientation === 'portrait' 
                              ? (mergeCount === 2 
                                ? 'repeat(1, 1fr)' 
                                : mergeCount === 4 
                                  ? 'repeat(2, 1fr)' 
                                  : mergeCount === 6 
                                    ? 'repeat(2, 1fr)' 
                                    : mergeCount === 8 
                                      ? 'repeat(2, 1fr)' 
                                      : 'repeat(2, 1fr)')
                            // 横向模式
                            : (mergeCount === 2 
                              ? 'repeat(2, 1fr)' 
                              : mergeCount === 4 
                                ? 'repeat(2, 1fr)' 
                                : mergeCount === 6 
                                  ? 'repeat(3, 1fr)' 
                                  : mergeCount === 8 
                                    ? 'repeat(4, 1fr)' 
                                    : 'repeat(5, 1fr)'),
                          gridTemplateRows: 
                            // 设置行数
                            pageOrientation === 'portrait'
                              ? (mergeCount === 2 
                                ? 'repeat(2, 1fr)' 
                                : mergeCount === 4 
                                  ? 'repeat(2, 1fr)' 
                                  : mergeCount === 6 
                                    ? 'repeat(3, 1fr)' 
                                    : mergeCount === 8 
                                      ? 'repeat(4, 1fr)' 
                                      : 'repeat(5, 1fr)')
                            // 横向模式
                            : (mergeCount === 2 
                              ? 'repeat(1, 1fr)' 
                              : mergeCount === 4 
                                ? 'repeat(2, 1fr)' 
                                : mergeCount === 6 
                                  ? 'repeat(2, 1fr)' 
                                  : mergeCount === 8 
                                    ? 'repeat(2, 1fr)' 
                                    : 'repeat(2, 1fr)'),
                          padding: 1,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          margin: '0 auto'
                        }}
                      >
                        {/* 预览中重新排列元素，确保列优先顺序 */}
                        {(() => {
                          // 创建位置映射，使预览与实际输出一致
                          const cols = pageOrientation === 'portrait'
                            ? (mergeCount === 2 ? 1 : 2) // 纵向模式下的列数
                            : (mergeCount === 2 ? 2 
                               : mergeCount === 4 ? 2 
                               : mergeCount === 6 ? 3 
                               : mergeCount === 8 ? 4 
                               : 5); // 横向模式下的列数
                            
                          const rows = pageOrientation === 'portrait'
                            ? (mergeCount === 2 ? 2 
                               : mergeCount === 4 ? 2 
                               : mergeCount === 6 ? 3 
                               : mergeCount === 8 ? 4 
                               : 5) // 纵向模式下的行数
                            : (mergeCount === 2 ? 1 : 2); // 横向模式下的行数
                            
                          const cells = [];
                          
                          if (pageOrientation === 'portrait') {
                            // 纵向模式：列优先排列（从上到下，从左到右）
                            // 计算每行的额外间距，模拟实际合并效果
                            const getExtraMargin = (r) => {
                              // 行数越多，上下间距越紧凑
                              if (rows >= 4) return `-${r * 2}px`;
                              if (rows >= 3) return `-${r * 1}px`;
                              return '0px';
                            };
                            
                            for (let c = 0; c < cols; c++) {
                              for (let r = 0; r < rows; r++) {
                                const index = c * rows + r;
                                if (index < mergeCount) {
                                  cells.push(
                                    <div 
                                      key={index} 
                                      style={{ 
                                        border: '1px solid #91d5ff',
                                        margin: 1,
                                        background: '#f0f9ff',
                                        boxShadow: 'inset 0 0 8px rgba(24, 144, 255, 0.1)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        gridColumn: c + 1,
                                        gridRow: r + 1,
                                        // 应用动态计算的上下间距 - 通过marginBlock避免与margin冲突
                                        marginBlock: r > 0 ? getExtraMargin(r) : '0px',
                                      }}
                                    >
                                      {/* 模拟发票内容 */}
                                      <div 
                                        style={{ 
                                          position: 'absolute', 
                                          top: '15%', 
                                          left: '10%', 
                                          right: '10%',
                                          height: '1px', 
                                          background: '#d6e4ff'
                                        }}
                                      />
                                      <div 
                                        style={{ 
                                          position: 'absolute', 
                                          bottom: '15%', 
                                          left: '10%', 
                                          right: '10%',
                                          height: '1px', 
                                          background: '#d6e4ff'
                                        }}
                                      />
                                    </div>
                                  );
                                }
                              }
                            }
                          } else {
                            // 横向模式：行优先排列（从左到右，从上到下）
                            for (let r = 0; r < rows; r++) {
                              for (let c = 0; c < cols; c++) {
                                const index = r * cols + c;
                                if (index < mergeCount) {
                                  cells.push(
                                    <div 
                                      key={index} 
                                      style={{ 
                                        border: '1px solid #91d5ff',
                                        margin: 1,
                                        background: '#f0f9ff',
                                        boxShadow: 'inset 0 0 8px rgba(24, 144, 255, 0.1)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        gridColumn: c + 1,
                                        gridRow: r + 1
                                      }}
                                    >
                                      {/* 模拟发票内容 */}
                                      <div 
                                        style={{ 
                                          position: 'absolute', 
                                          top: '15%', 
                                          left: '10%', 
                                          right: '10%',
                                          height: '1px', 
                                          background: '#d6e4ff'
                                        }}
                                      />
                                      <div 
                                        style={{ 
                                          position: 'absolute', 
                                          bottom: '15%', 
                                          left: '10%', 
                                          right: '10%',
                                          height: '1px', 
                                          background: '#d6e4ff'
                                        }}
                                      />
                                    </div>
                                  );
                                }
                              }
                            }
                          }
                          
                          return cells;
                        })()}
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 10 }}>
                        <Text type="secondary">预览效果（实际合并结果可能会有所不同）</Text>
                      </div>
                    </div>
                  </div>
        </Col>

                {/* 合并按钮区域 - 放在预览旁边 */}
                <Col span={10} style={{ marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<MergeCellsOutlined />}
                  onClick={handleMerge}
                  loading={isLoading}
                  style={{
                        height: 60,
                        fontSize: 18,
                        minWidth: 220,
                        borderRadius: '4px'
                  }}
                  disabled={selectedFiles.length === 0 || !exportPath}
                >
                  {isLoading ? '正在合并...' : '开始合并'}
                </Button>
            
                    <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                请确保已选择PDF文件和设置导出路径后点击合并按钮
              </Text>
            </div>
                  </div>
                </Col>
              </Row>
          </Card>
        </Col>

          {/* 使用说明 - 更新步骤描述 */}
          <Col span={24}>
            <Card title="使用说明" style={{ marginTop: 16, marginBottom: 16 }}>
        <Row gutter={16}>
                <Col span={6}>
            <Text strong>步骤1:</Text>
            <br />
            <Text>点击"选择PDF文件"按钮，可以同时选择多个PDF文件</Text>
          </Col>
                <Col span={6}>
            <Text strong>步骤2:</Text>
            <br />
            <Text>选择每页合并的PDF数量（2、4、6、8、10张可选）</Text>
          </Col>
                <Col span={6}>
            <Text strong>步骤3:</Text>
                  <br />
                  <Text>选择页面方向（纵向或横向）</Text>
                </Col>
                <Col span={6}>
                  <Text strong>步骤4:</Text>
            <br />
            <Text>选择导出路径，然后点击"开始合并"按钮</Text>
                </Col>
              </Row>
              <Divider dashed style={{ margin: '12px 0' }} />
              <Row>
                <Col span={24}>
                  <Text type="secondary">
                    注意：合并文件名将自动添加日期和时间标记，合并完成后将自动打开输出文件夹。
                  </Text>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
    </div>
    </AntdApp>
  );
}

export default App; 