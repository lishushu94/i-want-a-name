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
      const response = await fetch(`${WHOIS_API_BASE}${domain}`, {
        method: "GET",
        headers: {
          Accept: "application/rdap+json",
        },
      })

      if (response.status === 404) {
        // Domain not found = likely available
        return { ...result, available: true, checking: false }
      }

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

      // If we get other errors, we can't determine availability
      return { ...result, available: null, checking: false, error: "Unable to check" }
    } catch (error) {
      // Network error or API issue - try alternative method
      return this.checkDomainFallback(domain)
    }
  }

  // Fallback method using DNS lookup simulation
  private async checkDomainFallback(domain: string): Promise<DomainResult> {
    try {
      // Try to resolve via DNS-over-HTTPS (Cloudflare)
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
        headers: {
          Accept: "application/dns-json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        // If we get DNS records, domain is registered
        const hasRecords = data.Answer && data.Answer.length > 0
        return {
          domain,
          available: !hasRecords,
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
