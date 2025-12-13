import type { DomainResult, WhoisService } from "./types"

// Abstract WHOIS service - can be swapped for backend implementation later
// Currently uses free RDAP API (registration data access protocol)

const WHOIS_API_BASE = "https://rdap.org/domain/"

export class FrontendWhoisService implements WhoisService {
  async checkDomain(domain: string): Promise<DomainResult> {
    const result: DomainResult = {
      domain,
      available: null,
      checking: true,
    }

    try {
      // Using RDAP protocol - free and doesn't require API key
      const response = await fetch(`${WHOIS_API_BASE}${encodeURIComponent(domain)}`, {
        method: "GET",
        headers: {
          Accept: "application/rdap+json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        // Extract registrar and expiry info if available
        const registrar = data.entities
          ?.find((e: any) => e.roles?.includes("registrar"))
          ?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3]

        const expiryEvent = data.events?.find((e: any) => e.eventAction === "expiration")

        return {
          ...result,
          available: false,
          checking: false,
          registrar: registrar || "Unknown",
          expiryDate: expiryEvent?.eventDate,
        }
      }

      // RDAP 404 can mean "domain not found" OR "RDAP not supported for this TLD" (rdap.org may return HTML).
      if (response.status === 404) {
        const contentType = response.headers.get("content-type") ?? ""
        const looksLikeRdapJson =
          contentType.includes("application/rdap+json") || contentType.includes("application/json")

        if (looksLikeRdapJson) {
          return { ...result, available: true, checking: false }
        }

        // Fall back to DNS to avoid false positives (e.g., rdap.org has no RDAP URL for some TLDs).
        return this.checkDomainFallback(domain)
      }

      // Other errors: fall back to DNS before giving up.
      return this.checkDomainFallback(domain)
    } catch (error) {
      // Network error or API issue - try alternative method
      return this.checkDomainFallback(domain)
    }
  }

  // Fallback method using DNS lookup simulation
  private async checkDomainFallback(domain: string): Promise<DomainResult> {
    try {
      // Try to resolve via DNS-over-HTTPS (Cloudflare). NS is a better existence check than A.
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`, {
        headers: {
          Accept: "application/dns-json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        // https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/
        // Status: 0=NOERROR, 3=NXDOMAIN
        if (data.Status === 3) {
          return { domain, available: true, checking: false }
        }

        const hasAnswers = Array.isArray(data.Answer) && data.Answer.length > 0
        const hasAuthority = Array.isArray(data.Authority) && data.Authority.length > 0
        const hasRecords = hasAnswers || hasAuthority

        return {
          domain,
          available: hasRecords ? false : null,
          checking: false,
        }
      }

      return { domain, available: null, checking: false, error: "Check failed" }
    } catch {
      return { domain, available: null, checking: false, error: "Network error" }
    }
  }
}

// Factory function for creating WHOIS service
// In the future, this can return a BackendWhoisService instance
export function createWhoisService(): WhoisService {
  // TODO: Check for backend URL and return BackendWhoisService if available
  // if (process.env.NEXT_PUBLIC_WHOIS_BACKEND_URL) {
  //   return new BackendWhoisService(process.env.NEXT_PUBLIC_WHOIS_BACKEND_URL)
  // }
  return new FrontendWhoisService()
}
