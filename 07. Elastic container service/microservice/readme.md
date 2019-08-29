1. Build docker image
docker build -t microsite .

3. Login into repository
$(aws ecr get-login --no-include-email --region eu-west-1)

4. Go to your AWS console and find name your repository

4. Create a tag (change to your name of repository )
docker tag microsite:latest 646407006236.dkr.ecr.eu-west-1.amazonaws.com/microsite:latest

5. Push image to the repository (change for your repository)
docker push 646407006236.dkr.ecr.eu-west-1.amazonaws.com/microsite:latest

6. Go to readme from ecs



