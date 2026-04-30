// ============================================================
// OUTREACH EMAIL TEMPLATE — React Email
// Used by Resend to send subcontractor outreach emails.
// ============================================================

import {
  Html, Head, Body, Container, Heading, Text, Hr, Link, Preview,
} from '@react-email/components';
import * as React from 'react';

interface OutreachEmailProps {
  senderName: string;
  senderCompany: string;
  recipientName?: string;
  recipientCompany: string;
  subject: string;
  body: string;       // plain text or simple line-break text
  replyToEmail: string;
}

export function OutreachEmail({
  senderName,
  senderCompany,
  recipientName,
  recipientCompany,
  subject,
  body,
  replyToEmail,
}: OutreachEmailProps) {
  const greeting = recipientName ? `Hi ${recipientName},` : `Hello,`;

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: '32px auto', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '32px 40px' }}>
          <Heading style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            {subject}
          </Heading>
          <Hr style={{ borderColor: '#e5e7eb', margin: '16px 0' }} />

          <Text style={{ color: '#374151', fontSize: 14, lineHeight: 1.6 }}>{greeting}</Text>

          {body.split('\n').map((line, i) => (
            <Text key={i} style={{ color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '4px 0' }}>
              {line || '\u00A0'}
            </Text>
          ))}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0 16px' }} />

          <Text style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
            {senderName}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
            {senderCompany}
          </Text>
          <Link href={`mailto:${replyToEmail}`} style={{ color: '#2563eb', fontSize: 13 }}>
            {replyToEmail}
          </Link>

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0 12px' }} />
          <Text style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>
            You are receiving this email because {senderName} at {senderCompany} is exploring teaming opportunities
            in the Pittsburgh area government contracting space. Reply directly to this email to connect.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OutreachEmail;
