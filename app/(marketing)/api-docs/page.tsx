import { Metadata } from 'next';
import ApiDocsContent from './api-docs-content';

export const metadata: Metadata = {
  title: 'API Documentation — Enterprise Integration',
  description: 'Enterprise API documentation for OriginTrace. Programmatic access to supply chain batches, shipments, and farm data. RESTful endpoints with authentication, rate limiting, and comprehensive error handling.',
  keywords: ['OriginTrace API', 'supply chain API', 'traceability API', 'enterprise integration', 'REST API documentation', 'batch data API', 'shipment tracking API'],
  openGraph: {
    title: 'API Documentation — Enterprise Integration | OriginTrace',
    description: 'Programmatic access to your supply chain data. RESTful API with authentication, rate limiting, and full CRUD operations.',
    type: 'website',
  },
};

export default function ApiDocsPage() {
  return <ApiDocsContent />;
}
