#!/bin/bash

# QRush Trivia Load Testing Script
# Tests the application under high load

echo "🧪 QRush Trivia Load Testing"
echo "============================"

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ curl is not installed. Please install curl."
    exit 1
fi

# Configuration
BASE_URL="http://localhost:3000"
CONCURRENT_USERS=100
REQUESTS_PER_USER=10
TOTAL_REQUESTS=$((CONCURRENT_USERS * REQUESTS_PER_USER))

echo "🎯 Load Test Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Concurrent Users: $CONCURRENT_USERS"
echo "  Requests per User: $REQUESTS_PER_USER"
echo "  Total Requests: $TOTAL_REQUESTS"
echo ""

# Health check first
echo "🔍 Pre-test health check..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo "❌ Health check failed (HTTP $HEALTH_RESPONSE). Application may not be running."
    exit 1
fi
echo "✅ Health check passed"

# Create load test function
load_test() {
    local user_id=$1
    local requests=$2
    local results_file="load_test_results_$user_id.txt"
    
    echo "👤 User $user_id starting $requests requests..."
    
    for ((i=1; i<=requests; i++)); do
        # Test different endpoints
        case $((i % 4)) in
            0)
                endpoint="/health"
                ;;
            1)
                endpoint="/admin/game-stats"
                ;;
            2)
                endpoint="/admin/queue-stats"
                ;;
            3)
                endpoint="/webhook"
                ;;
        esac
        
        # Make request and measure response time
        start_time=$(date +%s%3N)
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
        end_time=$(date +%s%3N)
        response_time=$((end_time - start_time))
        
        echo "$response_code,$response_time" >> "$results_file"
        
        # Small delay between requests
        sleep 0.1
    done
    
    echo "✅ User $user_id completed $requests requests"
}

# Start load test
echo "🚀 Starting load test..."
start_time=$(date +%s)

# Start concurrent users
for ((user=1; user<=CONCURRENT_USERS; user++)); do
    load_test $user $REQUESTS_PER_USER &
done

# Wait for all users to complete
wait

end_time=$(date +%s)
total_time=$((end_time - start_time))

echo ""
echo "📊 Load Test Results:"
echo "===================="
echo "Total Time: ${total_time}s"
echo "Requests per Second: $((TOTAL_REQUESTS / total_time))"

# Analyze results
echo ""
echo "📈 Response Analysis:"

# Combine all result files
cat load_test_results_*.txt > combined_results.txt

# Count response codes
echo "Response Codes:"
awk -F',' '{print $1}' combined_results.txt | sort | uniq -c

# Calculate response time statistics
echo ""
echo "Response Times (ms):"
awk -F',' '{print $2}' combined_results.txt | sort -n | awk '
BEGIN {
    count = 0
    sum = 0
    min = 999999
    max = 0
}
{
    count++
    sum += $1
    if ($1 < min) min = $1
    if ($1 > max) max = $1
}
END {
    avg = sum / count
    print "  Min: " min "ms"
    print "  Max: " max "ms"
    print "  Avg: " int(avg) "ms"
    print "  Total: " count " requests"
}'

# Cleanup
rm -f load_test_results_*.txt combined_results.txt

echo ""
echo "✅ Load test completed!"
echo "💡 For more detailed testing, consider using tools like:"
echo "   - Apache Bench (ab)"
echo "   - Artillery.io"
echo "   - k6"
