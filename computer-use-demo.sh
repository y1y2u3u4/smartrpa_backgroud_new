


# export ANTHROPIC_API_KEY=""
export http_proxy=http://10.67.44.186:1082
export https_proxy=http://10.67.44.186:1082
docker run \
    -e http_proxy=$http_proxy \
    -e https_proxy=$https_proxy \
    -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
    -v $HOME/.anthropic:/home/computeruse/.anthropic \
    -p 5900:5900 \
    -p 8501:8501 \
    -p 6080:6080 \
    -p 8080:8080 \
    -it ghcr.io/anthropics/anthropic-quickstarts:computer-use-demo-latest



docker ps

docker exec -it c067e542a4e5 /bin/bash

echo $ANTHROPIC_API_KEY

echo $http_proxy
echo $https_proxy

curl -v https://api.anthropic.com


cat << EOF > test_api.py
import anthropic

client = anthropic.Anthropic(api_key="$ANTHROPIC_API_KEY")

try:
    response = client.completions.create(
        model="claude-2",
        prompt=f"{anthropic.HUMAN_PROMPT} Hello, Claude!{anthropic.AI_PROMPT}",
        max_tokens_to_sample=100
    )
    print(response.completion)
except Exception as e:
    print(f"Error: {e}")
EOF

python test_api.py