import { Card, Col, Row, Statistic, Typography, Spin } from 'antd';
import {
  WarningOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  useYieldForecast,
  useHealthMetrics,
  usePhenologyDistribution,
} from './hooks/useDashboard';

const { Title } = Typography;

const PIE_COLORS = [
  '#52c41a',
  '#1890ff',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
];

export function DashboardPage() {
  const yieldQuery = useYieldForecast();
  const healthQuery = useHealthMetrics();
  const phenologyQuery = usePhenologyDistribution();

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* Health Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: '3px solid #faad14' }}>
            <Statistic
              title="% Merma promedio"
              value={healthQuery.data?.avgLossPercent ?? 0}
              precision={1}
              suffix="%"
              loading={healthQuery.isLoading}
              valueStyle={{ color: '#d48806' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: '3px solid #1890ff' }}>
            <Statistic
              title="Elementos detectados"
              value={healthQuery.data?.totalDetected ?? 0}
              loading={healthQuery.isLoading}
              valueStyle={{ color: '#096dd9' }}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="Elementos sanos"
              value={healthQuery.data?.totalHealthyCount ?? 0}
              valueStyle={{ color: '#389e0d' }}
              loading={healthQuery.isLoading}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: '3px solid #f5222d' }}>
            <Statistic
              title="Elementos enfermos"
              value={healthQuery.data?.totalSickCount ?? 0}
              valueStyle={{ color: '#cf1322' }}
              loading={healthQuery.isLoading}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Yield Forecast Bar Chart */}
        <Col xs={24} lg={14}>
          <Card title="Proyección de Cosecha (días → gramos sanos)">
            {yieldQuery.isLoading ? (
              <Spin />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yieldQuery.data ?? []}>
                  <XAxis
                    dataKey="daysToHarvest"
                    label={{
                      value: 'Días para cosecha',
                      position: 'insideBottom',
                      offset: -4,
                    }}
                  />
                  <YAxis
                    label={{
                      value: 'Gramos sanos',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip
                    formatter={(v) => [`${v as number} g`, 'Peso estimado']}
                  />
                  <Bar dataKey="estimatedWeightGrams" fill="#52c41a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Phenology Donut */}
        <Col xs={24} lg={10}>
          <Card title="Distribución Fenológica">
            {phenologyQuery.isLoading ? (
              <Spin />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={phenologyQuery.data ?? []}
                    dataKey="count"
                    nameKey="stage"
                    innerRadius="50%"
                    outerRadius="75%"
                    paddingAngle={3}
                  >
                    {(phenologyQuery.data ?? []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v as number, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
