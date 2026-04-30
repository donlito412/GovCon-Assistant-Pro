// ============================================================
// ALERT EMAIL TEMPLATE — React Email
// Sent by /api/alerts/run when new contract matches are found.
// Uses @react-email/components for production-quality HTML email.
// ============================================================

import {
  Html, Head, Body, Container, Section,
  Text, Heading, Link, Hr, Preview, Row, Column, Img,
} from '@react-email/components';
import React from 'react';

interface AlertContract {
  id: number;
  title: string;
  agency_name: string | null;
  contract_type: string | null;
  value_max: number | null;
  value_min: number | null;
  deadline: string | null;
  source: string;
}

interface AlertEmailProps {
  searchName: string;
  newMatchCount: number;
  contracts: AlertContract[];
  appUrl: string;
  searchId: number;
  filtersQueryString: string;
}

function formatValue(cents: number | null): string {
  if (!cents) return 'N/A';
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1_000) return `$${(d / 1_000).toFixed(0)}K`;
  return `$${d.toLocaleString()}`;
}

function formatDeadline(iso: string | null): string {
  if (!iso) return 'No deadline';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceLabel(source: string): string {
  if (source.startsWith('federal_')) return 'Federal';
  if (source.startsWith('state_')) return 'PA State';
  if (source.startsWith('local_')) return 'Local';
  if (source.startsWith('education_')) return 'Education';
  return 'Other';
}

export function AlertEmail({
  searchName,
  newMatchCount,
  contracts,
  appUrl,
  searchId,
  filtersQueryString,
}: AlertEmailProps) {
  const previewText = `${newMatchCount} new match${newMatchCount !== 1 ? 'es' : ''} for "${searchName}"`;
  const browseUrl = `${appUrl}/contracts?${filtersQueryString}`;
  const manageUrl = `${appUrl}/saved-searches`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.headerLabel}>GovCon Assistant Pro</Text>
            <Heading style={styles.headerTitle}>
              {newMatchCount} New Match{newMatchCount !== 1 ? 'es' : ''}
            </Heading>
            <Text style={styles.headerSubtitle}>
              for saved search: <strong>&ldquo;{searchName}&rdquo;</strong>
            </Text>
          </Section>

          {/* Body */}
          <Section style={styles.body2}>
            <Text style={styles.intro}>
              We found <strong>{newMatchCount} new Pittsburgh-area contract opportunit{newMatchCount !== 1 ? 'ies' : 'y'}</strong> matching
              your saved search since the last check.
            </Text>

            {/* Contract list */}
            {contracts.slice(0, 10).map((contract) => (
              <Section key={contract.id} style={styles.contractCard}>
                <Row>
                  <Column>
                    <Text style={styles.contractSource}>{sourceLabel(contract.source)}</Text>
                    <Link
                      href={`${appUrl}/contracts/${contract.id}`}
                      style={styles.contractTitle}
                    >
                      {contract.title}
                    </Link>
                    {contract.agency_name && (
                      <Text style={styles.contractMeta}>🏢 {contract.agency_name}</Text>
                    )}
                    <Row style={styles.contractMetaRow}>
                      <Column>
                        <Text style={styles.contractMetaItem}>
                          💰 {formatValue(contract.value_max ?? contract.value_min)}
                        </Text>
                      </Column>
                      <Column>
                        <Text style={styles.contractMetaItem}>
                          📅 Due {formatDeadline(contract.deadline)}
                        </Text>
                      </Column>
                      {contract.contract_type && (
                        <Column>
                          <Text style={styles.contractMetaItem}>
                            📋 {contract.contract_type}
                          </Text>
                        </Column>
                      )}
                    </Row>
                    <Link
                      href={`${appUrl}/contracts/${contract.id}`}
                      style={styles.viewLink}
                    >
                      View Details →
                    </Link>
                  </Column>
                </Row>
              </Section>
            ))}

            {newMatchCount > 10 && (
              <Text style={styles.moreNote}>
                + {newMatchCount - 10} more results. Browse all matches below.
              </Text>
            )}

            {/* CTA */}
            <Section style={styles.ctaSection}>
              <Link href={browseUrl} style={styles.ctaButton}>
                Browse All {newMatchCount} Matches
              </Link>
            </Section>

            <Hr style={styles.divider} />

            {/* Footer */}
            <Text style={styles.footerText}>
              You received this email because you have alerts enabled for the saved search{' '}
              <strong>&ldquo;{searchName}&rdquo;</strong> in GovCon Assistant Pro.
            </Text>
            <Text style={styles.footerText}>
              <Link href={manageUrl} style={styles.footerLink}>Manage saved searches</Link>
              {' · '}
              <Link href={`${manageUrl}`} style={styles.footerLink}>Unsubscribe</Link>
            </Text>
            <Text style={styles.footerText}>
              GovCon Assistant Pro · Pittsburgh, PA · Murphree Enterprises
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ---- Inline styles (React Email requires inline CSS) ----

const styles = {
  body: {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    margin: '0',
    padding: '20px 0',
  } as React.CSSProperties,
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  } as React.CSSProperties,
  header: {
    background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    padding: '32px 32px 24px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  headerLabel: {
    color: '#bfdbfe',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    margin: '0 0 8px',
  } as React.CSSProperties,
  headerTitle: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '800',
    margin: '0 0 8px',
  } as React.CSSProperties,
  headerSubtitle: {
    color: '#bfdbfe',
    fontSize: '14px',
    margin: '0',
  } as React.CSSProperties,
  body2: {
    padding: '28px 32px',
  } as React.CSSProperties,
  intro: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
    margin: '0 0 20px',
  } as React.CSSProperties,
  contractCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  contractSource: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 4px',
  } as React.CSSProperties,
  contractTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e40af',
    textDecoration: 'none',
    lineHeight: '1.4',
    display: 'block',
    marginBottom: '6px',
  } as React.CSSProperties,
  contractMeta: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 6px',
  } as React.CSSProperties,
  contractMetaRow: {
    marginBottom: '8px',
  } as React.CSSProperties,
  contractMetaItem: {
    fontSize: '13px',
    color: '#374151',
    margin: '0',
    paddingRight: '12px',
  } as React.CSSProperties,
  viewLink: {
    fontSize: '13px',
    color: '#2563eb',
    fontWeight: '600',
    textDecoration: 'none',
  } as React.CSSProperties,
  moreNote: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    margin: '8px 0 20px',
  } as React.CSSProperties,
  ctaSection: {
    textAlign: 'center' as const,
    margin: '24px 0',
  } as React.CSSProperties,
  ctaButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'inline-block',
  } as React.CSSProperties,
  divider: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  } as React.CSSProperties,
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    margin: '4px 0',
    lineHeight: '1.6',
  } as React.CSSProperties,
  footerLink: {
    color: '#6b7280',
    textDecoration: 'underline',
  } as React.CSSProperties,
};

export default AlertEmail;
