# Secret Rotation Checklist

Date: 2026-08-05
Project: FWL CRM

## Purpose
Use this checklist after removing committed secrets/tokens from source and before trusting the CRM in production again.

## Rotate immediately
- Meta app secret
- Meta page access tokens
- Meta user access token used for OAuth-assisted flows
- webhook verify token(s)
- WhatsApp Cloud API token if it was ever committed or shared insecurely
- any test/admin credentials that may have been used on real environments

## Vercel / env update order
1. Add fresh secret values to Vercel env
2. Remove/revoke old secret values at provider side
3. Redeploy the CRM after env update
4. Verify the webhook and CAPI paths with safe tests

## Verify after rotation
- homepage still loads
- webhook GET verification works with the new token only
- invalid/old token returns 403
- Meta lead test still reaches CRM
- manual lead creation still works
- conversion path still updates DB
- CAPI event attempts still succeed if configured
- WhatsApp settings/send paths only work when new env is present

## Extended operator runbook
- See `/home/hackprac8/SafeProjects/business-growth-os/group-reports/FWL_CRM_POST_MERGE_SECRET_ROTATION_AND_VALIDATION_2026-08-05.md` for the full post-merge sequence covering Meta, CAPI, WhatsApp, and write-auth validation.

## Developer hygiene
- remove old local `.env` copies
- remove any token screenshots/snippets from notes or chats
- avoid printing raw secrets in debug logs
- do not recommit any real value into scripts or docs

## Git hygiene
- assume previously committed secrets are burned
- if needed, review old commits for additional leaked values
- do not rely on "file deleted now" as sufficient protection
