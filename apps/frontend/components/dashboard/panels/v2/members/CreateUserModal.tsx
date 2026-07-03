'use client';

import React, { useState } from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { formatUsPhone } from '@/lib/format-phone';
import { formatTitleCase } from '@/lib/format-text';
import type { CreateUserData } from './types';

interface CreateUserModalProps {
  onSubmit: (data: CreateUserData) => Promise<void>;
  onClose: () => void;
}

export function CreateUserModal({ onSubmit, onClose }: CreateUserModalProps) {
  useBlockScroll();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPERADMIN' | 'USER'>('USER');
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreateUserData = {
        email: email.trim(),
        password,
        role,
        accountType,
      };

      if (firstName.trim()) data.firstName = firstName.trim();
      if (lastName.trim()) data.lastName = lastName.trim();
      if (phone.trim()) data.phone = phone.trim();

      await onSubmit(data);
    } catch (err) {
      setError('Failed to create user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Member</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="form-error">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" required />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" minLength={8} required />
              <p className="form-hint">Minimum 8 characters</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select id="role" value={role} onChange={(e) => setRole(e.target.value as 'SUPERADMIN' | 'USER')} className="form-select">
                  <option value="USER">User</option>
                  <option value="SUPERADMIN">Master</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="accountType">Account Type</label>
                <select id="accountType" value={accountType} onChange={(e) => setAccountType(e.target.value as 'INDIVIDUAL' | 'BUSINESS')} className="form-select">
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(formatTitleCase(e.target.value))} className="form-input" />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(formatTitleCase(e.target.value))} className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(formatUsPhone(e.target.value))} className="form-input" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
