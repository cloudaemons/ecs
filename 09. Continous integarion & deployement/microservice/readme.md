1. Build docker image
docker build -t microsite .

2. Run docker loccaly
PORT=8080 && docker run -it -p 8080:${PORT} -e PORT=${PORT} microservice

3. Create private repository
aws ecr create-repository --repository-name microsite

4. Login into repository
$(aws ecr get-login --no-include-email --region eu-west-1)

5. Create a tag (change 646407006236 to your account number )
docker tag microsite:latest 646407006236.dkr.ecr.eu-west-1.amazonaws.com/microsite:latest

6. Push image to the repository (change 646407006236 to your account number )
docker push 646407006236.dkr.ecr.eu-west-1.amazonaws.com/microsite:latest




