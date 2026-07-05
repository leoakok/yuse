package scope

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
)

var (
	trustedProxyOnce sync.Once
	trustedProxyAll  bool
	trustedProxyNets []*net.IPNet
)

func loadTrustedProxyConfig() {
	trustedProxyOnce.Do(func() {
		value := strings.TrimSpace(os.Getenv("TRUSTED_PROXY"))
		if value != "" {
			parsed, err := strconv.ParseBool(value)
			if err == nil {
				trustedProxyAll = parsed
			}
		}
		trustedProxyNets = parseTrustedProxyCIDRs(os.Getenv("TRUSTED_PROXY_CIDRS"))
	})
}

func parseTrustedProxyCIDRs(raw string) []*net.IPNet {
	parts := strings.Split(raw, ",")
	nets := make([]*net.IPNet, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		_, network, err := net.ParseCIDR(trimmed)
		if err != nil {
			if ip := net.ParseIP(trimmed); ip != nil {
				bits := 128
				if ip.To4() != nil {
					bits = 32
				}
				network = &net.IPNet{IP: ip, Mask: net.CIDRMask(bits, bits)}
			} else {
				continue
			}
		}
		nets = append(nets, network)
	}
	return nets
}

func remoteIP(remoteAddr string) net.IP {
	host, _, err := net.SplitHostPort(strings.TrimSpace(remoteAddr))
	if err != nil {
		host = strings.TrimSpace(remoteAddr)
	}
	return net.ParseIP(host)
}

func trustsForwardedHeaders(remoteAddr string) bool {
	loadTrustedProxyConfig()
	if trustedProxyAll {
		return true
	}
	if len(trustedProxyNets) == 0 {
		return false
	}
	ip := remoteIP(remoteAddr)
	if ip == nil {
		return false
	}
	for _, network := range trustedProxyNets {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

func forwardedClientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}
	return ""
}

func directClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func clientIP(r *http.Request) string {
	if trustsForwardedHeaders(r.RemoteAddr) {
		if ip := forwardedClientIP(r); ip != "" {
			return ip
		}
	}
	return directClientIP(r)
}

// ClientIPFromRequest is a helper for rate limit keys.
func ClientIPFromRequest(r *http.Request) string {
	return clientIP(r)
}

// ResetTrustedProxyConfig clears cached proxy trust settings (tests only).
func ResetTrustedProxyConfig() {
	trustedProxyOnce = sync.Once{}
	trustedProxyAll = false
	trustedProxyNets = nil
}
